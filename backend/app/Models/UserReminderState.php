<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserReminderState extends Model
{
    protected $fillable = [
        'user_id',
        'reminder_id',
        'status',
        'snoozed_until',
    ];

    protected $casts = [
        'snoozed_until' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
