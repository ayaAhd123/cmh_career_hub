<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CandidateSkill extends Model
{
    protected $fillable = ['candidate_id', 'category', 'skill_name', 'score'];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    // Relations
    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    // Scopes
    public function scopeDiscipline($query)
    {
        return $query->where('category', 'Discipline');
    }

    public function scopeWorkSkills($query)
    {
        return $query->where('category', 'Work Skills');
    }
}
