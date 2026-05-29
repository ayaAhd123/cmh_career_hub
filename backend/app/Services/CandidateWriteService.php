<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Candidate;
use App\Models\CandidateSkill;
use App\Models\ModuleGrade;

class CandidateWriteService
{
    private const DISCIPLINE_KEYS = [
        'discipline' => 'Discipline et ponctualité',
        'motivation' => 'Motivation',
        'communication' => 'Communication',
        'listening' => "Sens de l'écoute",
    ];

    private const WORK_KEYS = [
        'initiative' => "Sens de l'initiative",
        'analysis' => "Capacité d'analyse",
        'organization' => 'Organisation',
        'intellectual' => 'Aptitudes intellectuelles',
        'pace' => "Rythme d'avancement",
        'speed' => "Rapidité d'exécution",
    ];

    public function seedDefaultSkills(Candidate $candidate): void
    {
        foreach (self::DISCIPLINE_KEYS as $name) {
            CandidateSkill::updateOrCreate(
                [
                    'candidate_id' => $candidate->id,
                    'skill_name' => $name,
                ],
                [
                    'category' => 'Discipline',
                    'score' => 0,
                ],
            );
        }

        foreach (self::WORK_KEYS as $name) {
            CandidateSkill::updateOrCreate(
                [
                    'candidate_id' => $candidate->id,
                    'skill_name' => $name,
                ],
                [
                    'category' => 'Work Skills',
                    'score' => 0,
                ],
            );
        }
    }

    public function syncSkills(Candidate $candidate, array $skills): void
    {
        foreach (self::DISCIPLINE_KEYS as $key => $name) {
            CandidateSkill::updateOrCreate(
                [
                    'candidate_id' => $candidate->id,
                    'skill_name' => $name,
                ],
                [
                    'category' => 'Discipline',
                    'score' => (float) ($skills['discipline'][$key] ?? 0),
                ],
            );
        }

        foreach (self::WORK_KEYS as $key => $name) {
            CandidateSkill::updateOrCreate(
                [
                    'candidate_id' => $candidate->id,
                    'skill_name' => $name,
                ],
                [
                    'category' => 'Work Skills',
                    'score' => (float) ($skills['work'][$key] ?? 0),
                ],
            );
        }

        ActivityLog::record(
            'Candidate',
            $candidate->id,
            'SKILLS_UPDATED',
            'Skills updated',
        );
    }

    public function syncModuleGrades(Candidate $candidate, array $modules): void
    {
        $candidate->loadMissing('promotion.modules');
        $promotionModules = $candidate->promotion?->modules ?? collect();

        foreach ($modules as $row) {
            $moduleOrder = (int) ($row['id'] ?? 0);
            $module = $promotionModules->firstWhere('module_order', $moduleOrder);

            if (! $module) {
                continue;
            }

            if (! array_key_exists('score', $row) || $row['score'] === null || $row['score'] === '') {
                ModuleGrade::query()
                    ->where('candidate_id', $candidate->id)
                    ->where('module_id', $module->id)
                    ->delete();

                continue;
            }

            $score = (float) $row['score'];

            ModuleGrade::updateOrCreate(
                [
                    'candidate_id' => $candidate->id,
                    'module_id' => $module->id,
                ],
                [
                    'score' => max(0, min(20, $score)),
                ],
            );
        }

        ActivityLog::record(
            'Candidate',
            $candidate->id,
            'MODULE_GRADES_UPDATED',
            'Module scores updated',
        );
    }

    public function updateStatus(Candidate $candidate, string $status): void
    {
        $candidate->update(['state' => $status]);

        ActivityLog::record(
            'Candidate',
            $candidate->id,
            'STATUS_CHANGED',
            "Status changed to {$status}",
        );
    }

    public function logRecruited(Candidate $candidate, ?int $userId = null): void
    {
        ActivityLog::record(
            'Candidate',
            $candidate->id,
            'RECRUITED',
            'Candidate recruited',
            $userId,
        );
    }

    public function logProfileUpdated(Candidate $candidate): void
    {
        ActivityLog::record(
            'Candidate',
            $candidate->id,
            'PROFILE_UPDATED',
            'Personal info updated',
        );
    }

    public function logArchived(Candidate $candidate): void
    {
        ActivityLog::record(
            'Candidate',
            $candidate->id,
            'ARCHIVED',
            'Candidate archived',
        );
    }
}
