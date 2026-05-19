<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'promotion_id',
        'name',
        'module_date_debut',
        'module_date_fin',
        'status',
        'module_order',
    ];

    protected $casts = [
        'module_date_debut' => 'date',
        'module_date_fin'   => 'date',
    ];

    // Relations
    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }

    public function moduleGrades()
    {
        return $this->hasMany(ModuleGrade::class);
    }

    // Scopes
    public function scopeByOrder($query)
    {
        return $query->orderBy('module_order', 'asc');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'In Progress');
    }
}
