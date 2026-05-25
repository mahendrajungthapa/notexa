<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AiService
{
    public function chat(string $systemPrompt, string $userPrompt): string
    {
        $provider = $this->configuredProvider();

        if (!$provider) {
            throw new RuntimeException('No server AI provider is configured. Add an API key in Admin Settings.');
        }

        return match ($provider['name']) {
            'gemini' => $this->gemini($provider, $systemPrompt, $userPrompt),
            default => $this->openAiCompatible($provider, $systemPrompt, $userPrompt),
        };
    }

    public function ocrImage(string $imageDataOrUrl): string
    {
        $provider = $this->configuredProvider();

        if (!$provider) {
            throw new RuntimeException('No server AI provider is configured. Add an API key in Admin Settings.');
        }

        $prompt = 'Extract every legible word from this image. Return only the plain transcribed text, preserving line breaks when useful. Do not add labels, markdown, greetings, commentary, or explanations.';

        return match ($provider['name']) {
            'gemini' => $this->geminiVision($provider, $prompt, $imageDataOrUrl),
            default => $this->openAiCompatibleVision($provider, $prompt, $imageDataOrUrl),
        };
    }

    public function summarize(string $text): ?string
    {
        $text = trim(preg_replace('/\s+/', ' ', $text));
        if ($text === '') {
            return null;
        }

        try {
            return $this->chat(
                'Create a concise study summary in 2-4 sentences. If the note contains tasks, include the key action items.',
                "Summarize this note:\n\n" . $text
            );
        } catch (RuntimeException) {
            return $this->fallbackSummary($text);
        }
    }

    private function configuredProvider(): ?array
    {
        $preferred = strtolower((string) $this->setting('ai_provider', 'AI_PROVIDER', 'deepseek'));
        $order = array_values(array_unique(array_filter([$preferred, 'deepseek', 'openai', 'gemini'])));

        foreach ($order as $name) {
            $key = $this->apiKey($name);
            if ($key !== '') {
                return [
                    'name' => $name,
                    'key' => $key,
                    'base_url' => $this->baseUrl($name),
                    'model' => $this->model($name),
                ];
            }
        }

        return null;
    }

    private function openAiCompatible(array $provider, string $systemPrompt, string $userPrompt): string
    {
        $response = Http::withToken($provider['key'])
            ->acceptJson()
            ->asJson()
            ->timeout(45)
            ->post(rtrim($provider['base_url'], '/') . '/chat/completions', [
                'model' => $provider['model'],
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'temperature' => 0.3,
                'max_tokens' => 1200,
            ]);

        if (!$response->successful()) {
            throw new RuntimeException('The server AI provider rejected the request.');
        }

        $text = trim((string) ($response->json('choices.0.message.content') ?? ''));
        if ($text === '') {
            throw new RuntimeException('The server AI provider returned an empty response.');
        }

        return $text;
    }

    private function openAiCompatibleVision(array $provider, string $prompt, string $imageDataOrUrl): string
    {
        $response = Http::withToken($provider['key'])
            ->acceptJson()
            ->asJson()
            ->timeout(55)
            ->post(rtrim($provider['base_url'], '/') . '/chat/completions', [
                'model' => $provider['model'],
                'messages' => [
                    ['role' => 'system', 'content' => 'You are an OCR engine. Return only transcribed text.'],
                    [
                        'role' => 'user',
                        'content' => [
                            ['type' => 'text', 'text' => $prompt],
                            ['type' => 'image_url', 'image_url' => ['url' => $imageDataOrUrl]],
                        ],
                    ],
                ],
                'temperature' => 0,
                'max_tokens' => 2000,
            ]);

        if (!$response->successful()) {
            throw new RuntimeException('The configured AI provider could not read this image. Use a vision-capable model or try a smaller PNG/JPEG image.');
        }

        $text = trim((string) ($response->json('choices.0.message.content') ?? ''));
        if ($text === '') {
            throw new RuntimeException('The OCR provider returned no text for this image.');
        }

        return $text;
    }

    private function gemini(array $provider, string $systemPrompt, string $userPrompt): string
    {
        $url = rtrim($provider['base_url'], '/') . '/models/' . rawurlencode($provider['model']) . ':generateContent';

        $response = Http::acceptJson()
            ->asJson()
            ->timeout(45)
            ->withQueryParameters(['key' => $provider['key']])
            ->post($url, [
                'contents' => [
                    ['parts' => [['text' => $systemPrompt . "\n\nUser request:\n" . $userPrompt]]],
                ],
                'generationConfig' => [
                    'temperature' => 0.3,
                    'maxOutputTokens' => 1200,
                ],
            ]);

        if (!$response->successful()) {
            throw new RuntimeException('The server AI provider rejected the request.');
        }

        $text = trim((string) ($response->json('candidates.0.content.parts.0.text') ?? ''));
        if ($text === '') {
            throw new RuntimeException('The server AI provider returned an empty response.');
        }

        return $text;
    }

    private function geminiVision(array $provider, string $prompt, string $imageDataOrUrl): string
    {
        $url = rtrim($provider['base_url'], '/') . '/models/' . rawurlencode($provider['model']) . ':generateContent';
        $parts = [['text' => $prompt]];

        $dataUrl = $this->parseDataUrl($imageDataOrUrl);
        if ($dataUrl) {
            $parts[] = [
                'inline_data' => [
                    'mime_type' => $dataUrl['mime_type'],
                    'data' => $dataUrl['data'],
                ],
            ];
        } else {
            $parts[] = ['text' => 'Image URL: ' . $imageDataOrUrl];
        }

        $response = Http::acceptJson()
            ->asJson()
            ->timeout(55)
            ->withQueryParameters(['key' => $provider['key']])
            ->post($url, [
                'contents' => [['parts' => $parts]],
                'generationConfig' => [
                    'temperature' => 0,
                    'maxOutputTokens' => 2000,
                ],
            ]);

        if (!$response->successful()) {
            throw new RuntimeException('The configured AI provider could not read this image. Use a vision-capable model or try a smaller PNG/JPEG image.');
        }

        $text = trim((string) ($response->json('candidates.0.content.parts.0.text') ?? ''));
        if ($text === '') {
            throw new RuntimeException('The OCR provider returned no text for this image.');
        }

        return $text;
    }

    private function parseDataUrl(string $imageDataOrUrl): ?array
    {
        if (!preg_match('/^data:([^;]+);base64,(.+)$/', $imageDataOrUrl, $matches)) {
            return null;
        }

        return [
            'mime_type' => $matches[1],
            'data' => $matches[2],
        ];
    }

    private function apiKey(string $provider): string
    {
        $env = match ($provider) {
            'openai' => 'OPENAI_API_KEY',
            'gemini' => 'GEMINI_API_KEY',
            default => 'DEEPSEEK_API_KEY',
        };

        return trim((string) $this->setting($provider . '_api_key', $env, ''));
    }

    private function baseUrl(string $provider): string
    {
        return (string) match ($provider) {
            'openai' => $this->setting('openai_base_url', 'OPENAI_BASE_URL', 'https://api.openai.com/v1'),
            'gemini' => $this->setting('gemini_base_url', 'GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
            default => $this->setting('deepseek_base_url', 'DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
        };
    }

    private function model(string $provider): string
    {
        $model = (string) match ($provider) {
            'openai' => $this->setting('openai_model', 'OPENAI_MODEL', 'gpt-4o-mini'),
            'gemini' => $this->setting('gemini_model', 'GEMINI_MODEL', 'gemini-1.5-flash'),
            default => $this->setting('deepseek_model', 'DEEPSEEK_MODEL', 'deepseek-v4-flash'),
        };

        if ($provider === 'deepseek') {
            return match ($model) {
                'deepseek-chat', 'deepseek-reasoner' => 'deepseek-v4-flash',
                default => $model,
            };
        }

        return $model;
    }

    private function setting(string $key, string $envKey, mixed $default): mixed
    {
        $value = SiteSetting::get($key, null);
        if ($value !== null && $value !== '') {
            return $value;
        }

        return env($envKey, $default);
    }

    private function fallbackSummary(string $text): ?string
    {
        $sentences = preg_split('/(?<=[.!?])\s+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $sentences = array_values(array_filter(array_map('trim', $sentences), fn ($sentence) => strlen($sentence) > 20));

        if (empty($sentences)) {
            $snippet = substr($text, 0, 260);
            return $snippet . (strlen($text) > 260 ? '...' : '');
        }

        $summary = implode(' ', array_slice($sentences, 0, 3));
        return strlen($summary) > 700 ? substr($summary, 0, 697) . '...' : $summary;
    }
}
