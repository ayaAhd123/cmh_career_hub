<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ActivityLog extends Model
{
    public $timestamps = false; // Table immuable — created_at géré manuellement

    protected $fillable = [
        'user_id', 'target_type', 'target_id', 'action_type', 'description',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // Relations
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Crée et persiste une entrée de log.
     *
     * Usage :
     * ActivityLog::record('Candidate', $candidate->id, 'STATUS_CHANGED', 'State changed to Graduated');
     */
    public static function record(
        string $targetType,
        ?int $targetId,
        string $actionType,
        string $description,
        ?int $userId = null
    ): self {
        return static::create([
            'user_id'     => $userId ?? Auth::id(),
            'target_type' => $targetType,
            'target_id'   => $targetId,
            'action_type' => $actionType,
            'description' => $description,
            'created_at'  => now(),
        ]);
    }
}
