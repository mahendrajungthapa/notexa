<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudyStreakTest extends TestCase
{
    use RefreshDatabase;

    public function test_streak_uses_client_local_date_and_continues_from_previous_day(): void
    {
        $user = User::factory()->create([
            'username' => 'streak_user',
            'is_active' => true,
            'streak_count' => 4,
            'last_streak_date' => '2026-05-25',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/streak/complete', [
            'streak_date' => '2026-05-26',
            'timezone' => 'Asia/Katmandu',
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('streak_count', 5)
            ->assertJsonPath('last_streak_date', '2026-05-26')
            ->assertJsonPath('streak_completed', true);

        $this->assertSame(5, (int) $user->fresh()->streak_count);
    }

    public function test_streak_is_idempotent_for_same_local_day(): void
    {
        $user = User::factory()->create([
            'username' => 'same_day_streak',
            'is_active' => true,
            'streak_count' => 2,
            'last_streak_date' => '2026-05-26',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/streak/complete', [
            'streak_date' => '2026-05-26',
            'timezone' => 'Asia/Katmandu',
        ]);

        $response->assertOk()
            ->assertJsonPath('streak_count', 2)
            ->assertJsonPath('last_streak_date', '2026-05-26')
            ->assertJsonPath('streak_completed', false);
    }

    public function test_streak_resets_after_missing_a_day(): void
    {
        $user = User::factory()->create([
            'username' => 'missed_streak',
            'is_active' => true,
            'streak_count' => 7,
            'last_streak_date' => '2026-05-20',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/streak/complete', [
            'streak_date' => '2026-05-26',
        ]);

        $response->assertOk()
            ->assertJsonPath('streak_count', 1)
            ->assertJsonPath('last_streak_date', '2026-05-26')
            ->assertJsonPath('streak_completed', true);
    }
}
