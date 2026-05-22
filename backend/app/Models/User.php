<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = ['full_name', 'email', 'password', 'role'];

    protected $hidden = ['password'];

    protected $casts = [
        'deleted_at' => 'datetime',
    ];

    // Relations
    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function reportExports()
    {
        return $this->hasMany(ReportExport::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }
}
