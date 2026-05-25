<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_user_can_login_and_is_marked_for_email_verification(): void
    {
        SiteSetting::set('email_verification_enabled', true, 'boolean', 'email');

        $user = User::factory()->unverified()->create([
            'name' => 'Verify User',
            'username' => 'verify_user',
            'email' => 'verify@example.com',
            'password' => Hash::make('secure-password'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'login' => $user->email,
            'password' => 'secure-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('email_verification_required', true)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.email_verified_at', null)
            ->assertJsonStructure(['token']);
    }

    public function test_unverified_admin_is_not_forced_through_user_email_verification_gate(): void
    {
        SiteSetting::set('email_verification_enabled', true, 'boolean', 'email');

        $admin = User::factory()->unverified()->create([
            'name' => 'Admin User',
            'username' => 'admin_user',
            'email' => 'admin@example.com',
            'password' => Hash::make('secure-password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'login' => $admin->email,
            'password' => 'secure-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('email_verification_required', false)
            ->assertJsonPath('user.email', $admin->email)
            ->assertJsonStructure(['token']);
    }
}
