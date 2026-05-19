<?php

namespace App\Observers;

use App\Models\Module;
use App\Models\ActivityLog;

class ModuleObserver
{
    public function updated(Module $module): void
    {
        // Log automatique si le statut change
        if ($module->wasChanged('status')) {
            ActivityLog::record(
                targetType: 'Module',
                targetId: $module->id,
                actionType: 'STATUS_CHANGED',
                description: "Module '{$module->name}' status changed to '{$module->status}'",
            );
        }
    }
}
