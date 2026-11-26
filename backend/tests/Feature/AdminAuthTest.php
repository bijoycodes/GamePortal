<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_returns_a_sanctum_token_for_admins(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.test',
            'password' => Hash::make('secret-password'),
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@example.test',
            'password' => 'secret-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'admin@example.test')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);

        $token = $response->json('token');
        self::assertIsString($token);
        self::assertSame(1, $admin->tokens()->count());

        $this->withToken($token)->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonPath('email', 'admin@example.test');
    }

    public function test_login_rejects_bad_credentials_and_non_admins(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.test',
            'password' => Hash::make('secret-password'),
        ]);
        User::factory()->create([
            'email' => 'player@example.test',
            'password' => Hash::make('player-password'),
        ]);

        $this->postJson('/api/admin/login', [
            'email' => 'admin@example.test',
            'password' => 'wrong',
        ])->assertUnauthorized()->assertJsonPath('code', 'INVALID_CREDENTIALS');

        $this->postJson('/api/admin/login', [
            'email' => 'player@example.test',
            'password' => 'player-password',
        ])->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
    }

    public function test_admin_routes_require_admin_role(): void
    {
        $this->getJson('/api/admin/games')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');

        Sanctum::actingAs(User::factory()->create(), ['*']);
        $this->getJson('/api/admin/games')->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');
    }

    public function test_logout_revokes_the_current_token(): void
    {
        User::factory()->admin()->create([
            'email' => 'admin@example.test',
            'password' => Hash::make('secret-password'),
        ]);

        $token = (string) $this->postJson('/api/admin/login', [
            'email' => 'admin@example.test',
            'password' => 'secret-password',
        ])->json('token');

        $this->withToken($token)->postJson('/api/admin/logout')->assertNoContent();

        // Simulate a fresh HTTP request: the guard caches the user between test requests.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/admin/me')->assertUnauthorized();
    }
}
