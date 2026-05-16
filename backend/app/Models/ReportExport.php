<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportExport extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_id', 'report_type', 'format'];

    protected $casts = [
        'generated_at' => 'datetime',
    ];

    // Relations
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
