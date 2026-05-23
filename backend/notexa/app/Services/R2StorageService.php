<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class R2StorageService
{
    public function upload(UploadedFile $file, string $directory = 'files'): array
    {
        $storedName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $directory . '/' . $storedName;
        $disk = $this->r2Configured() ? 'r2' : 'public';

        // Use putFileAs for proper binary upload; local public storage is the
        // default fallback for college/demo installs without R2 credentials.
        Storage::disk($disk)->putFileAs($directory, $file, $storedName, [
            'ContentType' => $file->getClientMimeType(),
        ]);

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
            return Storage::disk('r2')->temporaryUrl($path, now()->addMinutes($minutes));
        } catch (\Exception $e) {
            return $this->getUrl($path);
        }
    }

    public function downloadResponse(string $path, string $downloadName): StreamedResponse
    {
        $disk = $this->diskFor($path);
        $key = $this->cleanKey($path);

        abort_unless(Storage::disk($disk)->exists($key), 404, 'File not found.');

        return Storage::disk($disk)->download($key, $downloadName);
    }

    private function r2Configured(): bool
    {
        return filled(config('filesystems.disks.r2.key'))
            && filled(config('filesystems.disks.r2.secret'))
            && filled(config('filesystems.disks.r2.endpoint'));
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
}
