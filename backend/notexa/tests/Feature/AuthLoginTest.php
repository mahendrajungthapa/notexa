<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login_with_username_and_password(): void
    {
        $user = User::factory()->create([
            'name' => 'Username Login',
            'username' => 'username_login',
            'email' => 'username-login@example.com',
            'password' => Hash::make('secure-password'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'login' => 'username_login',
            'password' => 'secure-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonStructure(['token']);
    }

    public function test_user_can_login_with_email_and_password(): void
    {
        $user = User::factory()->create([
            'name' => 'Email Login',
            'username' => 'email_login',
            'email' => 'email-login@example.com',
            'password' => Hash::make('secure-password'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'login' => 'email-login@example.com',
            'password' => 'secure-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonStructure(['token']);
    }
}
