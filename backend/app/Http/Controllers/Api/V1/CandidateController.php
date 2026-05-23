<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Services\CandidateExportService;
use App\Services\CandidateFormatter;
use App\Services\CandidateQueryService;
use App\Services\CandidateWriteService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CandidateController extends Controller
{
    public function __construct(
        private readonly CandidateQueryService $queryService,
        private readonly CandidateExportService $exportService,
        private readonly CandidateFormatter $formatter,
        private readonly CandidateWriteService $writeService,
    ) {}

    public function index(Request $request)
    {
        $filters = $this->validatedFilters($request);

        return response()->json($this->queryService->list($filters));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'promotionId' => 'required|string|max:50',
            'firstName' => 'required|string|max:50',
            'lastName' => 'required|string|max:50',
            'email' => 'required|email|max:100|unique:candidates,email',
            'phone' => 'required|string|max:20',
            'recruitmentDate' => 'required|date|before_or_equal:today',
            'age' => 'required|integer|min:18|max:65',
            'gender' => 'required|in:Homme,Femme',
            'educationLevel' => 'required|in:Bac,Bac+2,Bac+3,Bac+4,Bac+5,Bac+8',
            'diplomaName' => 'required|string|max:100',
            'diplomaAverage' => 'required|numeric|min:0|max:20',
            'photo' => 'nullable|string',
        ]);

        $promotionId = $this->queryService->resolvePromotionId($validated['promotionId']);
        if (! $promotionId) {
            return response()->json(['message' => 'Promotion not found'], 404);
        }

        $candidate = Candidate::create([
            'promotion_id' => $promotionId,
            'first_name' => $validated['firstName'],
            'last_name' => $validated['lastName'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'recruitment_date' => $validated['recruitmentDate'],
            'age' => $validated['age'],
            'gender' => $validated['gender'],
            'photo' => $validated['photo'] ?? null,
            'education_level' => $validated['educationLevel'],
            'diploma_specialty' => $validated['diplomaName'],
            'diploma_average' => $validated['diplomaAverage'],
            'state' => 'Active',
        ]);

        $this->writeService->seedDefaultSkills($candidate);
        $this->writeService->logRecruited($candidate);

        return response()->json($this->detailResponse($candidate), 201);
    }

    public function show(Candidate $candidate)
    {
        return response()->json($this->detailResponse($candidate));
    }

    public function export(Request $request)
    {
        $filters = $this->validatedFilters($request);
        $validated = $request->validate([
            'format' => 'required|in:csv,json,html',
            'lang' => 'nullable|in:en,fr',
        ]);

        $rows = $this->queryService->exportRows($filters);

        return $this->exportService->export(
            $rows,
            $validated['format'],
            $filters,
            $validated['lang'] ?? 'en',
        );
    }

    public function update(Request $request, Candidate $candidate)
    {
        $validated = $request->validate([
            'firstName' => 'sometimes|required|string|max:50',
            'lastName' => 'sometimes|required|string|max:50',
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:100',
                Rule::unique('candidates', 'email')->ignore($candidate->id),
            ],
            'phone' => 'sometimes|required|string|max:20',
            'recruitmentDate' => 'sometimes|required|date|before_or_equal:today',
            'age' => 'sometimes|required|integer|min:18|max:65',
            'gender' => 'sometimes|required|in:Homme,Femme',
            'educationLevel' => 'sometimes|required|in:Bac,Bac+2,Bac+3,Bac+4,Bac+5,Bac+8',
            'diplomaName' => 'sometimes|required|string|max:100',
            'diplomaAverage' => 'sometimes|required|numeric|min:0|max:20',
            'photo' => 'nullable|string',
        ]);

        $candidate->update([
            'first_name' => $validated['firstName'] ?? $candidate->first_name,
            'last_name' => $validated['lastName'] ?? $candidate->last_name,
            'email' => $validated['email'] ?? $candidate->email,
            'phone' => $validated['phone'] ?? $candidate->phone,
            'recruitment_date' => $validated['recruitmentDate'] ?? $candidate->recruitment_date,
            'age' => $validated['age'] ?? $candidate->age,
            'gender' => $validated['gender'] ?? $candidate->gender,
            'photo' => array_key_exists('photo', $validated) ? $validated['photo'] : $candidate->photo,
            'education_level' => $validated['educationLevel'] ?? $candidate->education_level,
            'diploma_specialty' => $validated['diplomaName'] ?? $candidate->diploma_specialty,
            'diploma_average' => $validated['diplomaAverage'] ?? $candidate->diploma_average,
        ]);

        $this->writeService->logProfileUpdated($candidate);

        return response()->json($this->detailResponse($candidate));
    }

    public function updateSkills(Request $request, Candidate $candidate)
    {
        $validated = $request->validate([
            'skills' => 'required|array',
            'skills.discipline' => 'required|array',
            'skills.discipline.discipline' => 'required|numeric|min:0|max:5',
            'skills.discipline.motivation' => 'required|numeric|min:0|max:5',
            'skills.discipline.communication' => 'required|numeric|min:0|max:5',
            'skills.discipline.listening' => 'required|numeric|min:0|max:5',
            'skills.work' => 'required|array',
            'skills.work.initiative' => 'required|numeric|min:0|max:5',
            'skills.work.analysis' => 'required|numeric|min:0|max:5',
            'skills.work.organization' => 'required|numeric|min:0|max:5',
            'skills.work.intellectual' => 'required|numeric|min:0|max:5',
            'skills.work.pace' => 'required|numeric|min:0|max:5',
            'skills.work.speed' => 'required|numeric|min:0|max:5',
        ]);

        $this->writeService->syncSkills($candidate, $validated['skills']);

        return response()->json($this->detailResponse($candidate));
    }

    public function updateModuleGrades(Request $request, Candidate $candidate)
    {
        $validated = $request->validate([
            'modules' => 'required|array',
            'modules.*.id' => 'required|integer|min:1|max:20',
            'modules.*.score' => 'required|numeric|min:0|max:20',
        ]);

        $this->writeService->syncModuleGrades($candidate, $validated['modules']);

        return response()->json($this->detailResponse($candidate));
    }

    public function updateStatus(Request $request, Candidate $candidate)
    {
        $validated = $request->validate([
            'status' => 'required|in:Active,Graduated,Dismissed,Terminated,Archived',
        ]);

        $this->writeService->updateStatus($candidate, $validated['status']);

        return response()->json($this->detailResponse($candidate));
    }

    public function destroy(Request $request, Candidate $candidate)
    {
        $request->validate([
            'confirm' => 'required|in:DELETE',
        ]);

        $this->writeService->logArchived($candidate);
        $candidate->delete();

        return response()->noContent();
    }

    private function detailResponse(Candidate $candidate): array
    {
        $candidate->load([
            'promotion',
            'skills',
            'moduleGrades',
            'promotion.modules' => fn ($q) => $q->orderBy('module_order'),
        ]);

        return $this->formatter->formatDetail($candidate);
    }

    private function validatedFilters(Request $request): array
    {
        return $request->validate([
            'q' => 'nullable|string|max:100',
            'status' => 'nullable|string|max:20',
            'gender' => 'nullable|string|max:20',
            'education_level' => 'nullable|string|max:20',
            'category' => 'nullable|string|max:20',
            'promotion_id' => 'nullable|string|max:50',
            'sort' => 'nullable|in:avg_desc,avg_asc,name_asc,name_desc,date_desc,date_asc',
        ]);
    }
}
