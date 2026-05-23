<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Candidate;
use Illuminate\Support\Collection;

class CandidateFormatter
{
    private const DISCIPLINE_SKILLS = [
        'Discipline et ponctualité' => 'discipline',
        'Motivation' => 'motivation',
        'Communication' => 'communication',
        "Sens de l'écoute" => 'listening',
    ];

    private const WORK_SKILLS = [
        "Sens de l'initiative" => 'initiative',
        "Capacité d'analyse" => 'analysis',
        'Organisation' => 'organization',
        'Aptitudes intellectuelles' => 'intellectual',
        "Rythme d'avancement" => 'pace',
        "Rapidité d'exécution" => 'speed',
        "Rapidité d'exécution des tâches" => 'speed',
    ];

    public function formatListItem(Candidate $candidate): array
    {
        $avg = CandidateScoreService::overallAverage($candidate);

        return [
            'id' => (string) $candidate->id,
            'dbId' => $candidate->id,
            'promotionId' => $candidate->promotion?->promo_code ?? '',
            'promotionName' => $candidate->promotion?->name ?? '',
            'firstName' => $candidate->first_name,
            'lastName' => $candidate->last_name,
            'email' => $candidate->email,
            'phone' => $candidate->phone,
            'recruitmentDate' => $candidate->recruitment_date->format('Y-m-d'),
            'age' => $candidate->age,
            'gender' => $candidate->gender,
            'photo' => $candidate->photo,
            'educationLevel' => $candidate->education_level,
            'diplomaName' => $candidate->diploma_specialty ?? '',
            'diplomaAverage' => $candidate->diploma_average,
            'status' => $candidate->state,
            'avgScore' => $avg,
            'category' => CandidateScoreService::categoryFor($avg),
            'archived' => $candidate->state === 'Archived',
            'createdAt' => $candidate->created_at->toISOString(),
        ];
    }

    public function formatExportRow(Candidate $candidate): array
    {
        $item = $this->formatListItem($candidate);

        return [
            'firstName' => $item['firstName'],
            'lastName' => $item['lastName'],
            'email' => $item['email'],
            'phone' => $item['phone'],
            'gender' => $item['gender'],
            'age' => $item['age'],
            'educationLevel' => $item['educationLevel'],
            'diplomaName' => $item['diplomaName'],
            'diplomaAverage' => $item['diplomaAverage'],
            'promotionId' => $item['promotionId'],
            'promotionName' => $item['promotionName'],
            'status' => $item['status'],
            'avgScore' => $item['avgScore'],
            'category' => $item['category'],
            'recruitmentDate' => $item['recruitmentDate'],
        ];
    }

    public function formatDetail(Candidate $candidate): array
    {
        return array_merge($this->formatListItem($candidate), [
            'skills' => $this->formatSkills($candidate->skills),
            'modules' => $this->formatModules($candidate),
            'history' => $this->formatHistory($candidate),
        ]);
    }

    public function formatHistory(Candidate $candidate): array
    {
        return ActivityLog::query()
            ->where('target_type', 'Candidate')
            ->where('target_id', $candidate->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ActivityLog $log) => [
                'date' => $log->created_at->toISOString(),
                'event' => $log->description,
            ])
            ->values()
            ->all();
    }

    public function formatSkills(Collection $skills): array
    {
        $discipline = [
            'discipline' => 0,
            'motivation' => 0,
            'communication' => 0,
            'listening' => 0,
        ];
        $work = [
            'initiative' => 0,
            'analysis' => 0,
            'organization' => 0,
            'intellectual' => 0,
            'pace' => 0,
            'speed' => 0,
        ];

        foreach ($skills as $skill) {
            $score = (float) $skill->score;

            if ($key = self::DISCIPLINE_SKILLS[$skill->skill_name] ?? null) {
                $discipline[$key] = $score;
            }

            if ($key = self::WORK_SKILLS[$skill->skill_name] ?? null) {
                $work[$key] = $score;
            }
        }

        return [
            'discipline' => $discipline,
            'work' => $work,
        ];
    }

    public function formatModules(Candidate $candidate): array
    {
        $grades = $candidate->moduleGrades->keyBy('module_id');
        $modules = $candidate->promotion?->modules ?? collect();

        return $modules->sortBy('module_order')->values()->map(function ($module) use ($grades) {
            $grade = $grades->get($module->id);

            return [
                'id' => $module->module_order,
                'name' => $module->name,
                'score' => $grade ? (float) $grade->score : 0,
            ];
        })->all();
    }
}
