<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModuleGrade extends Model
{
    protected $fillable = ['candidate_id', 'module_id', 'score'];

    protected $casts = [
        'score' => 'decimal:2',
    ];

    // Relations
    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    public function module()
    {
        return $this->belongsTo(Module::class);
    }
}
