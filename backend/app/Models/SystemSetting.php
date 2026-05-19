<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'company_name',
        'default_duration_days',
        'modules_per_promo',
        'passing_threshold',
    ];

    protected $casts = [
        'passing_threshold' => 'decimal:2',
    ];

    /**
     * Retourne le premier enregistrement (singleton).
     * Usage : SystemSetting::current()
     */
    public static function current(): ?self
    {
        return static::first();
    }
}
