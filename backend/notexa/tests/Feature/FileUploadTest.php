<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FileUploadTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_upload_file_with_raw_fallback_payload(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'username' => 'uploadtest',
            'storage_limit' => 1024 * 1024,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $response = $this->putJson('/api/files/upload', [
            'file_base64' => base64_encode('hello world'),
            'original_name' => 'hello.txt',
            'mime_type' => 'text/plain',
            'size' => 11,
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.original_name', 'hello.txt')
            ->assertJsonPath('data.preview_type', 'text');

        $file = File::query()->firstOrFail();

        Storage::disk('public')->assertExists($file->path);
        $this->assertSame(11, (int) $user->fresh()->storage_used);
    }

    public function test_legacy_post_raw_upload_still_works(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'username' => 'postuploadtest',
            'storage_limit' => 1024 * 1024,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/files/upload', [
            'file_base64' => base64_encode('legacy post'),
            'original_name' => 'legacy.txt',
            'mime_type' => 'text/plain',
            'size' => 11,
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.original_name', 'legacy.txt');
    }
}
