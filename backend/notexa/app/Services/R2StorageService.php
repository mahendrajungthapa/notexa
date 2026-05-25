<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class R2StorageService
{
    public function upload(UploadedFile $file, string $directory = 'files'): array
    {
        $storedName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $directory . '/' . $storedName;
        $disk = $this->uploadDisk();

        // Use putFileAs for proper binary upload; local public storage is the
        // default fallback for college/demo installs without R2 credentials.
        $stored = Storage::disk($disk)->putFileAs($directory, $file, $storedName, [
            'ContentType' => $file->getClientMimeType(),
        ]);

        if (!$stored) {
            throw new RuntimeException('The storage disk rejected the uploaded file.');
        }

        $storageKey = $disk === 'public' ? 'local:' . $path : $path;

        return [
            'original_name' => $file->getClientOriginalName(),
            'stored_name' => $storedName,
            'path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'r2_key' => $storageKey,
            'r2_url' => $this->getUrl($storageKey),
        ];
    }

    public function uploadRaw(string $contents, string $originalName, string $mimeType, string $directory = 'files'): array
    {
        $safeOriginal = $this->safeOriginalName($originalName);
        $extension = pathinfo($safeOriginal, PATHINFO_EXTENSION);
        $storedName = Str::uuid() . ($extension ? ".{$extension}" : '');
        $path = $directory . '/' . $storedName;
        $disk = $this->uploadDisk();

        $stored = Storage::disk($disk)->put($path, $contents, [
            'visibility' => 'public',
            'ContentType' => $mimeType ?: 'application/octet-stream',
        ]);

        if (!$stored) {
            throw new RuntimeException('The storage disk rejected the uploaded file.');
        }

        $storageKey = $disk === 'public' ? 'local:' . $path : $path;

        return [
            'original_name' => $safeOriginal,
            'stored_name' => $storedName,
            'path' => $path,
            'mime_type' => $mimeType ?: 'application/octet-stream',
            'size' => strlen($contents),
            'r2_key' => $storageKey,
            'r2_url' => $this->getUrl($storageKey),
        ];
    }

    public function delete(string $path): bool
    {
        return Storage::disk($this->diskFor($path))->delete($this->cleanKey($path));
    }

    public function getUrl(string $path): string
    {
        if ($this->isLocalKey($path)) {
            return Storage::disk('public')->url($this->cleanKey($path));
        }

        // If R2 public URL is set, use it directly
        $this->applyR2Settings();
        $publicUrl = config('filesystems.disks.r2.url');
        if ($publicUrl) {
            return rtrim($publicUrl, '/') . '/' . $path;
        }

        try {
            return Storage::disk('r2')->temporaryUrl($path, now()->addHours(1));
        } catch (\Exception $e) {
            return '';
        }
    }

    public function getTemporaryUrl(string $path, int $minutes = 60, ?int $fileId = null): string
    {
        if ($this->isLocalKey($path) && $fileId) {
            return URL::temporarySignedRoute('api.files.content', now()->addMinutes($minutes), ['file' => $fileId]);
        }

        try {
            $this->applyR2Settings();
            return Storage::disk('r2')->temporaryUrl($path, now()->addMinutes($minutes));
        } catch (\Exception $e) {
            return $this->getUrl($path);
        }
    }

    public function getTemporaryPreviewUrl(string $path, int $minutes = 60, ?int $fileId = null): string
    {
        if ($fileId) {
            return URL::temporarySignedRoute('api.files.preview', now()->addMinutes($minutes), ['file' => $fileId]);
        }

        return $this->getTemporaryUrl($path, $minutes, $fileId);
    }

    public function downloadResponse(string $path, string $downloadName): StreamedResponse
    {
        $disk = $this->diskFor($path);
        $key = $this->cleanKey($path);

        abort_unless(Storage::disk($disk)->exists($key), 404, 'File not found.');

        return Storage::disk($disk)->download($key, $downloadName);
    }

    public function inlineResponse(string $path, string $name, string $mimeType): StreamedResponse
    {
        $disk = $this->diskFor($path);
        $key = $this->cleanKey($path);

        abort_unless(Storage::disk($disk)->exists($key), 404, 'File not found.');

        return Storage::disk($disk)->response($key, $name, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="' . addslashes($name) . '"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function storedSize(string $path): ?int
    {
        try {
            $disk = $this->diskFor($path);
            $key = $this->cleanKey($path);

            if (!Storage::disk($disk)->exists($key)) {
                return null;
            }

            $size = Storage::disk($disk)->size($key);

            return is_numeric($size) ? (int) $size : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function r2Configured(): bool
    {
        $this->applyR2Settings();

        return filled(config('filesystems.disks.r2.key'))
            && filled(config('filesystems.disks.r2.secret'))
            && filled(config('filesystems.disks.r2.bucket'))
            && filled(config('filesystems.disks.r2.endpoint'));
    }

    private function uploadDisk(): string
    {
        return SiteSetting::get('storage_driver', 'local') === 'r2' && $this->r2Configured()
            ? 'r2'
            : 'public';
    }

    private function applyR2Settings(): void
    {
        $key = SiteSetting::get('r2_access_key', config('filesystems.disks.r2.key'));
        $secret = SiteSetting::get('r2_secret_key', config('filesystems.disks.r2.secret'));
        $bucket = SiteSetting::get('r2_bucket', config('filesystems.disks.r2.bucket'));
        $endpoint = SiteSetting::get('r2_endpoint', config('filesystems.disks.r2.endpoint'));
        $url = SiteSetting::get('r2_public_url', config('filesystems.disks.r2.url'));

        Config::set('filesystems.disks.r2.key', $key);
        Config::set('filesystems.disks.r2.secret', $secret);
        Config::set('filesystems.disks.r2.bucket', $bucket);
        Config::set('filesystems.disks.r2.endpoint', $endpoint);
        Config::set('filesystems.disks.r2.url', $url ?: null);
    }

    private function isLocalKey(string $path): bool
    {
        return str_starts_with($path, 'local:');
    }

    private function diskFor(string $path): string
    {
        return $this->isLocalKey($path) ? 'public' : 'r2';
    }

    private function cleanKey(string $path): string
    {
        return $this->isLocalKey($path) ? substr($path, 6) : $path;
    }

    private function safeOriginalName(string $name): string
    {
        $name = trim(str_replace(['\\', '/'], '', $name));

        return $name !== '' ? Str::limit($name, 180, '') : 'upload.bin';
    }
}
