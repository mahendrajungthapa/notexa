<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\FileFolder;
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

    public function test_file_list_repairs_missing_size_from_local_storage(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'username' => 'sizerepair',
            'is_active' => true,
        ]);

        $path = "users/{$user->id}/report.pdf";
        Storage::disk('public')->put($path, str_repeat('a', 1536));

        $file = File::create([
            'user_id' => $user->id,
            'note_id' => null,
            'original_name' => 'report.pdf',
            'stored_name' => 'report.pdf',
            'path' => $path,
            'mime_type' => 'application/pdf',
            'size' => 0,
            'r2_key' => 'local:' . $path,
            'r2_url' => null,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/files')
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.data.0.size', 1536);

        $this->assertSame(1536, (int) $file->fresh()->size);
    }

    public function test_user_can_create_folder_and_upload_file_into_it(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'username' => 'folderupload',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $folderResponse = $this->postJson('/api/file-folders', ['name' => 'Reports']);
        $folderResponse->assertCreated()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'Reports');

        $folderId = $folderResponse->json('data.id');

        $this->putJson('/api/files/upload', [
            'file_base64' => base64_encode('folder file'),
            'original_name' => 'folder.txt',
            'mime_type' => 'text/plain',
            'folder_id' => $folderId,
        ])->assertCreated()
            ->assertJsonPath('data.folder_id', $folderId);

        $this->getJson('/api/files?folder_id=root')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');

        $this->getJson("/api/files?folder_id={$folderId}")
            ->assertOk()
            ->assertJsonPath('data.data.0.original_name', 'folder.txt');
    }

    public function test_user_cannot_upload_into_another_users_folder(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create(['username' => 'folderowner', 'is_active' => true]);
        $user = User::factory()->create(['username' => 'folderguest', 'is_active' => true]);
        $folder = FileFolder::create([
            'user_id' => $owner->id,
            'parent_id' => null,
            'name' => 'Private',
        ]);

        Sanctum::actingAs($user);

        $this->putJson('/api/files/upload', [
            'file_base64' => base64_encode('blocked'),
            'original_name' => 'blocked.txt',
            'mime_type' => 'text/plain',
            'folder_id' => $folder->id,
        ])->assertNotFound();
    }
}
