<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\OcrService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OcrEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_ocr_endpoint_works_when_ai_tools_are_disabled(): void
    {
        $user = User::factory()->create([
            'username' => 'ocr_user',
            'is_active' => true,
        ]);
        $note = Note::create([
            'user_id' => $user->id,
            'title' => 'OCR Note',
            'content' => '<p>OCR test</p>',
            'plain_text' => 'OCR test',
            'color' => '#ffffff',
        ]);

        SiteSetting::set('ai_enabled', false, 'boolean', 'ai');
        Sanctum::actingAs($user);

        $this->app->instance(OcrService::class, new class extends OcrService {
            public function readImage(string $imageData): string
            {
                return 'Scanned text from package OCR';
            }
        });

        $response = $this->postJson("/api/notes/{$note->id}/ocr", [
            'image' => 'data:image/png;base64,' . base64_encode('fake-image'),
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.text', 'Scanned text from package OCR');
    }
}
