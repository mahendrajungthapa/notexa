<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Http;

class DeepSeekService
{
    public function summarize(string $text): ?string
    {
        $text = trim(preg_replace('/\s+/', ' ', $text));
        if ($text === '') {
            return null;
        }

        $apiKey = SiteSetting::get('deepseek_api_key', '');
        if (empty($apiKey)) {
            return $this->fallbackSummary($text);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.deepseek.com/chat/completions', [
                'model' => 'deepseek-chat',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a helpful assistant that summarizes notes concisely. Provide a clear, brief summary in 2-4 sentences. If the note contains tasks, list the key action items.',
                    ],
                    [
                        'role' => 'user',
                        'content' => "Summarize this note:\n\n" . $text,
                    ],
                ],
                'max_tokens' => 300,
                'temperature' => 0.3,
            ]);

            if (!$response->successful()) {
                return $this->fallbackSummary($text);
            }

            $data = $response->json();
            $summary = trim((string) ($data['choices'][0]['message']['content'] ?? ''));

            return $summary !== '' ? $summary : $this->fallbackSummary($text);
        } catch (\Exception $e) {
            return $this->fallbackSummary($text);
        }
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
        if (strlen($summary) > 700) {
            $summary = substr($summary, 0, 697) . '...';
        }

        return $summary;
    }
}
