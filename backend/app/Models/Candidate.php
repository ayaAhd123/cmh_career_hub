<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Candidate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'promotion_id', 'first_name', 'last_name', 'email', 'phone',
        'recruitment_date', 'age', 'gender', 'photo', 'education_level', 'diploma_specialty',
        'diploma_average', 'state', 'overall_avg', 'category',
    ];

    protected $casts = [
        'recruitment_date' => 'date',
        'diploma_average'  => 'decimal:2',
        'overall_avg'      => 'decimal:2',
        'deleted_at'       => 'datetime',
    ];

    // Accessor
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    // Relations
    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }

    public function moduleGrades()
    {
        return $this->hasMany(ModuleGrade::class);
    }

    public function skills()
    {
        return $this->hasMany(CandidateSkill::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('state', 'Active');
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Recalcule overall_avg et met à jour category automatiquement.
     * Appelé par ModuleGradeObserver après chaque save().
     */
    public function recalculateOverallAvg(): void
    {
        $avg = $this->moduleGrades()->avg('score') ?? 0;
        $threshold = SystemSetting::current()?->passing_threshold ?? 10;

        $this->overall_avg = round($avg, 2);
        $this->category = match(true) {
            $avg >= 16             => 'Excellent',
            $avg >= $threshold + 2 => 'Bien',
            $avg >= $threshold     => 'Passable',
            default                => 'Critique',
        };

        $this->saveQuietly(); // saveQuietly évite de déclencher les Observers en boucle
    }
}
