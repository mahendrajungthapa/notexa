<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_settings_accept_empty_settings_array_as_no_op(): void
    {
        $admin = User::factory()->create([
            'username' => 'settings_admin',
            'role' => 'admin',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->putJson('/api/admin/settings', [
            'settings' => [],
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success');
    }
}
