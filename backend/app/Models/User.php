<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function setPasswordAttribute(string $value): void
    {
        if (! Hash::needsRehash($value)) {
            $this->attributes['password'] = $value;

            return;
        }

        $this->attributes['password'] = Hash::make($value);
    }

    /** @return HasMany<Game> */
    public function createdGames(): HasMany
    {
        return $this->hasMany(Game::class, 'created_by');
    }

    /** @return HasMany<Game> */
    public function updatedGames(): HasMany
    {
        return $this->hasMany(Game::class, 'updated_by');
    }

    /** @return HasMany<GameSession> */
    public function sessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }

    /** @return HasMany<AuditLog> */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}
