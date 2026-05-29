<?php

namespace Database\Seeders;

use App\Models\Candidate;
use App\Models\CandidateSkill;
use App\Models\Module;
use App\Models\ModuleGrade;
use App\Models\Promotion;
use App\Services\PassRateBaselineService;
use Illuminate\Database\Seeder;

class CandidateSeeder extends Seeder
{
    private const MODULE_NAMES = [
        "Notions en Email Marketing",
        "Composants de l'Email",
        "CPA (Cost Per Action)",
        "Authentification de l'Email",
        "Délivrabilité de l'Email",
    ];

    private const DISCIPLINE_SKILLS = [
        'Discipline et ponctualité',
        'Motivation',
        'Communication',
        "Sens de l'écoute",
    ];

    private const WORK_SKILLS = [
        "Sens de l'initiative",
        "Capacité d'analyse",
        'Organisation',
        'Aptitudes intellectuelles',
        "Rythme d'avancement",
        "Rapidité d'exécution",
    ];

    /** @var array<string, list<array<string, mixed>>> */
    private const ROSTER = [
        'SPRING2026' => [
            ['first_name' => 'Karim', 'last_name' => 'El Amrani', 'gender' => 'Homme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Marketing Digital', 'profile' => 'strong'],
            ['first_name' => 'Yasmine', 'last_name' => 'Benali', 'gender' => 'Femme', 'education_level' => 'Bac+3', 'diploma_specialty' => 'Commerce', 'profile' => 'strong'],
            ['first_name' => 'Mehdi', 'last_name' => 'Tazi', 'gender' => 'Homme', 'education_level' => 'Bac+2', 'diploma_specialty' => 'Marketing Digital', 'profile' => 'average'],
            ['first_name' => 'Sofia', 'last_name' => 'Cherkaoui', 'gender' => 'Femme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Communication', 'profile' => 'average'],
            ['first_name' => 'Omar', 'last_name' => 'Idrissi', 'gender' => 'Homme', 'education_level' => 'Bac+3', 'diploma_specialty' => 'Informatique', 'profile' => 'weak'],
            ['first_name' => 'Lina', 'last_name' => 'Bennani', 'gender' => 'Femme', 'education_level' => 'Bac+8', 'diploma_specialty' => 'Génie Logiciel', 'profile' => 'strong'],
            ['first_name' => 'Aya', 'last_name' => 'Fassi', 'gender' => 'Femme', 'education_level' => 'Bac+2', 'diploma_specialty' => 'Commerce', 'profile' => 'incomplete'],
            ['first_name' => 'Hamza', 'last_name' => 'Alaoui', 'gender' => 'Homme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Marketing Digital', 'profile' => 'average'],
        ],
        'DATAQ3' => [
            ['first_name' => 'Salma', 'last_name' => 'Ouazzani', 'gender' => 'Femme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Data Science', 'profile' => 'strong'],
            ['first_name' => 'Amine', 'last_name' => 'Lahlou', 'gender' => 'Homme', 'education_level' => 'Bac+3', 'diploma_specialty' => 'Statistiques', 'profile' => 'average'],
            ['first_name' => 'Nadia', 'last_name' => 'Ziani', 'gender' => 'Femme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Informatique', 'profile' => 'weak'],
            ['first_name' => 'Rachid', 'last_name' => 'Mouline', 'gender' => 'Homme', 'education_level' => 'Bac+2', 'diploma_specialty' => 'Commerce', 'profile' => 'incomplete'],
            ['first_name' => 'Imane', 'last_name' => 'Sefrioui', 'gender' => 'Femme', 'education_level' => 'Bac+8', 'diploma_specialty' => 'Analyse de données', 'profile' => 'strong'],
        ],
        'MARKSPRINT' => [
            ['first_name' => 'Hassan', 'last_name' => 'Berrada', 'gender' => 'Homme', 'education_level' => 'Bac+3', 'diploma_specialty' => 'Marketing Digital', 'profile' => 'average'],
            ['first_name' => 'Kenza', 'last_name' => 'Filali', 'gender' => 'Femme', 'education_level' => 'Bac+2', 'diploma_specialty' => 'Communication', 'profile' => 'weak'],
            ['first_name' => 'Ilyas', 'last_name' => 'Mansouri', 'gender' => 'Homme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Marketing Digital', 'profile' => 'strong'],
            ['first_name' => 'Zineb', 'last_name' => 'Hajji', 'gender' => 'Femme', 'education_level' => 'Bac+3', 'diploma_specialty' => 'Communication', 'profile' => 'average'],
        ],
        'UIUXMASTER' => [
            ['first_name' => 'Adam', 'last_name' => 'Bouazza', 'gender' => 'Homme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Design UX', 'profile' => 'strong'],
            ['first_name' => 'Rim', 'last_name' => 'Chakir', 'gender' => 'Femme', 'education_level' => 'Bac+3', 'diploma_specialty' => 'Design Graphique', 'profile' => 'average'],
            ['first_name' => 'Walid', 'last_name' => 'Senhaji', 'gender' => 'Homme', 'education_level' => 'Bac+2', 'diploma_specialty' => 'Multimedia', 'profile' => 'weak'],
            ['first_name' => 'Hiba', 'last_name' => 'Touimi', 'gender' => 'Femme', 'education_level' => 'Bac+8', 'diploma_specialty' => 'Design UX', 'profile' => 'strong'],
        ],
        'WEBDEV2024' => [
            ['first_name' => 'Tarik', 'last_name' => 'Naciri', 'gender' => 'Homme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Génie Logiciel', 'profile' => 'strong', 'state' => 'Graduated'],
            ['first_name' => 'Hind', 'last_name' => 'Rami', 'gender' => 'Femme', 'education_level' => 'Bac+5', 'diploma_specialty' => 'Informatique', 'profile' => 'strong', 'state' => 'Graduated'],
            ['first_name' => 'Youssef', 'last_name' => 'Kettani', 'gender' => 'Homme', 'education_level' => 'Bac+3', 'diploma_specialty' => 'Développement Web', 'profile' => 'average', 'state' => 'Graduated'],
            ['first_name' => 'Meryem', 'last_name' => 'Sqalli', 'gender' => 'Femme', 'education_level' => 'Bac+2', 'diploma_specialty' => 'Informatique', 'profile' => 'weak', 'state' => 'Dismissed'],
        ],
    ];

    public function run(): void
    {
        $promotions = Promotion::query()
            ->where('status', '!=', 'Archived')
            ->get();

        if ($promotions->isEmpty()) {
            $this->command?->warn('CandidateSeeder: no promotions found — run PromotionSeeder first.');

            return;
        }

        $created = 0;

        foreach ($promotions as $promotion) {
            $modules = $this->ensureModules($promotion);
            $roster = self::ROSTER[$promotion->promo_code] ?? $this->defaultRoster($promotion);

            foreach ($roster as $index => $row) {
                $email = strtolower("{$row['first_name']}.{$row['last_name']}.{$promotion->promo_code}@cmh.ma");
                $recruitmentDate = $promotion->start_date->copy()->subDays(min(10, $index * 2));

                $candidate = Candidate::updateOrCreate(
                    ['email' => $email],
                    [
                        'promotion_id' => $promotion->id,
                        'first_name' => $row['first_name'],
                        'last_name' => $row['last_name'],
                        'phone' => '+212 6' . str_pad((string) (61000000 + $index + $promotion->id), 8, '0', STR_PAD_LEFT),
                        'recruitment_date' => $recruitmentDate->toDateString(),
                        'age' => 20 + ($index % 12),
                        'gender' => $row['gender'],
                        'education_level' => $row['education_level'],
                        'diploma_specialty' => $row['diploma_specialty'],
                        'diploma_average' => round(12 + ($index % 7), 1),
                        'state' => $row['state'] ?? $this->defaultState($promotion, $index),
                    ],
                );

                $this->syncSkills($candidate, $row['profile']);
                $this->syncModuleGrades($candidate, $modules, $promotion, $row['profile']);

                $candidate->recalculateOverallAvg();
                $created++;
            }
        }

        $this->seedUnassignedCandidates();
        app(PassRateBaselineService::class)->primeDemoBaselines($promotions);

        $this->command?->info("CandidateSeeder: seeded {$created} candidates across {$promotions->count()} promotions.");
    }

    private function seedUnassignedCandidates(): void
    {
        Candidate::updateOrCreate(
            ['email' => 'unassigned.demo@cmh.ma'],
            [
                'promotion_id' => null,
                'first_name' => 'Sara',
                'last_name' => 'Unassigned',
                'phone' => '+212 600000099',
                'recruitment_date' => now()->subDays(3)->toDateString(),
                'age' => 24,
                'gender' => 'Femme',
                'education_level' => 'Bac+3',
                'diploma_specialty' => 'Marketing Digital',
                'diploma_average' => 13.5,
                'state' => 'Active',
            ],
        );
    }

    /** @return list<array<string, mixed>> */
    private function defaultRoster(Promotion $promotion): array
    {
        return [
            [
                'first_name' => 'Demo',
                'last_name' => 'Candidate',
                'gender' => 'Homme',
                'education_level' => 'Bac+3',
                'diploma_specialty' => 'Marketing Digital',
                'profile' => 'average',
            ],
        ];
    }

    private function defaultState(Promotion $promotion, int $index): string
    {
        if ($promotion->status === 'Completed') {
            return $index % 4 === 3 ? 'Dismissed' : 'Graduated';
        }

        if ($index % 7 === 6) {
            return 'Graduated';
        }

        if ($index % 11 === 10) {
            return 'Dismissed';
        }

        return 'Active';
    }

    private function ensureModules(Promotion $promotion)
    {
        if ($promotion->modules()->exists()) {
            return $promotion->modules()->orderBy('module_order')->get();
        }

        $start = $promotion->start_date->copy();

        foreach (self::MODULE_NAMES as $index => $name) {
            Module::create([
                'promotion_id' => $promotion->id,
                'name' => $name,
                'module_date_debut' => $start->copy()->addDays($index * 7)->toDateString(),
                'module_date_fin' => $start->copy()->addDays(($index * 7) + 4)->toDateString(),
                'status' => $index === 0 ? 'In Progress' : 'Not Started',
                'module_order' => $index + 1,
            ]);
        }

        return $promotion->modules()->orderBy('module_order')->get();
    }

    private function syncSkills(Candidate $candidate, string $profile): void
    {
        CandidateSkill::query()->where('candidate_id', $candidate->id)->delete();

        if ($profile === 'incomplete') {
            return;
        }

        [$min, $max] = match ($profile) {
            'strong' => [4.0, 5.0],
            'weak' => [1.5, 2.4],
            default => [2.8, 4.2],
        };

        foreach (self::DISCIPLINE_SKILLS as $skillName) {
            CandidateSkill::create([
                'candidate_id' => $candidate->id,
                'category' => 'Discipline',
                'skill_name' => $skillName,
                'score' => $this->randomScore($min, $max),
            ]);
        }

        foreach (self::WORK_SKILLS as $skillName) {
            CandidateSkill::create([
                'candidate_id' => $candidate->id,
                'category' => 'Work Skills',
                'skill_name' => $skillName,
                'score' => $this->randomScore($min, $max),
            ]);
        }
    }

    private function syncModuleGrades(Candidate $candidate, $modules, Promotion $promotion, string $profile): void
    {
        ModuleGrade::query()->where('candidate_id', $candidate->id)->delete();

        if ($profile === 'incomplete' || $promotion->start_date->isFuture()) {
            return;
        }

        $moduleLimit = match ($profile) {
            'strong' => $modules->count(),
            'weak' => max(2, (int) ceil($modules->count() / 2)),
            'incomplete' => 0,
            default => max(3, (int) ceil($modules->count() * 0.75)),
        };

        [$min, $max] = match ($profile) {
            'strong' => [15.0, 19.5],
            'weak' => [6.0, 11.0],
            default => [11.0, 16.5],
        };

        foreach ($modules->take($moduleLimit) as $module) {
            ModuleGrade::create([
                'candidate_id' => $candidate->id,
                'module_id' => $module->id,
                'score' => $this->randomScore($min, $max),
            ]);
        }
    }

    private function randomScore(float $min, float $max): float
    {
        return round($min + (mt_rand() / mt_getrandmax()) * ($max - $min), 1);
    }
}
