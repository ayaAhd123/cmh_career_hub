<?php

namespace App\Observers;

use App\Models\ModuleGrade;

class ModuleGradeObserver
{
    public function saved(ModuleGrade $grade): void
    {
        // Recalcule la moyenne du candidat après chaque note sauvegardée
        $grade->candidate->recalculateOverallAvg();
    }

    public function deleted(ModuleGrade $grade): void
    {
        // Recalcule aussi si une note est supprimée
        $grade->candidate->recalculateOverallAvg();
    }
}
