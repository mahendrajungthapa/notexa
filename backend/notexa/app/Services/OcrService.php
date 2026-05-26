<?php

namespace App\Services;

use Illuminate\Support\Str;
use RuntimeException;
use thiagoalessio\TesseractOCR\TesseractOCR;
use Throwable;

class OcrService
{
    private const MAX_IMAGE_BYTES = 8388608;

    public function readImage(string $imageData): string
    {
        $image = $this->decodeImage($imageData);
        $directory = storage_path('app/ocr');

        if (! is_dir($directory)) {
            @mkdir($directory, 0775, true);
        }

        $path = $directory . DIRECTORY_SEPARATOR . 'ocr-' . Str::uuid() . '.' . $image['extension'];

        try {
            if (file_put_contents($path, $image['contents']) === false) {
                throw new RuntimeException('OCR could not prepare the uploaded image.');
            }

            $binary = $this->tesseractBinary();
            $language = (string) config('services.tesseract.lang', 'eng');
            $pageSegmentationMode = (string) config('services.tesseract.psm', '6');
            $packageError = null;

            try {
                $ocr = new TesseractOCR($path);

                if ($binary) {
                    $ocr->executable($binary);
                }

                if ($language !== '') {
                    $ocr->lang($language);
                }

                if ($pageSegmentationMode !== '') {
                    $ocr->psm($pageSegmentationMode);
                }

                $text = $this->cleanText($ocr->run());
                if ($text !== '') {
                    return $text;
                }

                $packageError = 'The OCR package returned empty text.';
            } catch (Throwable $e) {
                $packageError = $e->getMessage();
            }

            if ($this->functionEnabled('exec')) {
                $text = $this->runDirectTesseract($path, $binary, $language, $pageSegmentationMode);
                if ($text !== '') {
                    return $text;
                }
            }

            throw new RuntimeException($this->availabilityMessage($packageError));
        } catch (Throwable $e) {
            throw new RuntimeException($this->availabilityMessage($e->getMessage()), previous: $e);
        } finally {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function decodeImage(string $imageData): array
    {
        $input = trim($imageData);
        $mime = 'image/png';
        $base64 = $input;

        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s', $input, $matches)) {
            $mime = strtolower($matches[1]);
            $base64 = $matches[2];
        }

        $extension = match ($mime) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/png' => 'png',
            'image/bmp', 'image/x-ms-bmp' => 'bmp',
            'image/tiff' => 'tif',
            'image/webp' => 'webp',
            default => throw new RuntimeException('OCR supports PNG, JPG, BMP, TIFF, and WebP images.'),
        };

        $contents = base64_decode($base64, true);
        if ($contents === false || $contents === '') {
            throw new RuntimeException('OCR image payload is not valid base64 data.');
        }

        if (strlen($contents) > self::MAX_IMAGE_BYTES) {
            throw new RuntimeException('OCR image is too large. Maximum size is 8MB.');
        }

        return [
            'contents' => $contents,
            'extension' => $extension,
        ];
    }

    public function binaryPath(): ?string
    {
        $configured = trim((string) config('services.tesseract.binary', ''));
        if ($configured !== '') {
            return $configured;
        }

        $fromCommand = $this->findWithCommand();
        if ($fromCommand) {
            return $fromCommand;
        }

        foreach ($this->commonBinaryPaths() as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    public function diagnostics(): array
    {
        $binary = $this->binaryPath();

        return [
            'configured_binary' => trim((string) config('services.tesseract.binary', '')),
            'detected_binary' => $binary,
            'binary_exists' => $binary ? (is_file($binary) || $binary === 'tesseract') : false,
            'proc_open_enabled' => $this->functionEnabled('proc_open'),
            'exec_enabled' => $this->functionEnabled('exec'),
            'shell_exec_enabled' => $this->functionEnabled('shell_exec'),
            'version' => $this->tesseractVersion($binary),
            'common_paths' => $this->commonBinaryPaths(),
        ];
    }

    private function tesseractBinary(): ?string
    {
        return $this->binaryPath();
    }

    private function commonBinaryPaths(): array
    {
        return [
            '/usr/bin/tesseract',
            '/usr/local/bin/tesseract',
            '/usr/local/tesseract/bin/tesseract',
            '/snap/bin/tesseract',
            '/opt/tesseract/bin/tesseract',
            '/opt/homebrew/bin/tesseract',
            'C:\\Program Files\\Tesseract-OCR\\tesseract.exe',
            'C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe',
        ];
    }

    private function findWithCommand(): ?string
    {
        if (! $this->functionEnabled('shell_exec')) {
            return null;
        }

        $result = @shell_exec('command -v tesseract 2>/dev/null');
        $path = trim((string) $result);

        return $path !== '' ? $path : null;
    }

    private function tesseractVersion(?string $binary): ?string
    {
        if (! $binary || ! $this->functionEnabled('exec')) {
            return null;
        }

        $output = [];
        $exitCode = 1;
        @exec(escapeshellarg($binary) . ' --version 2>&1', $output, $exitCode);

        return $exitCode === 0 ? trim((string) ($output[0] ?? '')) : null;
    }

    private function runDirectTesseract(string $imagePath, ?string $binary, string $language, string $pageSegmentationMode): string
    {
        $binary ??= 'tesseract';
        $command = escapeshellarg($binary) . ' ' . escapeshellarg($imagePath) . ' stdout';

        if ($language !== '') {
            $command .= ' -l ' . escapeshellarg($language);
        }

        if ($pageSegmentationMode !== '') {
            $command .= ' --psm ' . escapeshellarg($pageSegmentationMode);
        }

        $output = [];
        $exitCode = 1;
        @exec($command . ' 2>&1', $output, $exitCode);
        $text = $this->cleanText(implode("\n", $output));

        if ($exitCode !== 0) {
            throw new RuntimeException('Direct Tesseract execution failed: ' . ($text ?: 'unknown command error'));
        }

        return $text;
    }

    private function cleanText(string $text): string
    {
        $text = trim($text);
        $text = preg_replace('/^Estimating resolution as \d+\s*/mi', '', $text) ?? $text;

        return trim($text);
    }

    private function availabilityMessage(?string $detail = null): string
    {
        $message = 'OCR engine is not available to PHP. Run php artisan notexa:ocr-check, install the tesseract-ocr server package, or set TESSERACT_BINARY to the full tesseract executable path.';

        if ($detail) {
            $message .= ' Detail: ' . trim($detail);
        }

        return $message;
    }

    private function functionEnabled(string $name): bool
    {
        if (! function_exists($name)) {
            return false;
        }

        $disabled = array_map('trim', explode(',', (string) ini_get('disable_functions')));

        return ! in_array($name, $disabled, true);
    }
}
