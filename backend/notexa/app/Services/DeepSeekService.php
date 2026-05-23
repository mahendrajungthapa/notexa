<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Http;

class DeepSeekService
{
    public function summarize(string $text): ?string
    {
        $apiKey = SiteSetting::get('deepseek_api_key', '');
        if (empty($apiKey)) {
            return null;
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

            $data = $response->json();
            return $data['choices'][0]['message']['content'] ?? null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
