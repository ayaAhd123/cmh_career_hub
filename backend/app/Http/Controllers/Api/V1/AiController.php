<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\GeminiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class AiController extends Controller
{
    public function __construct(
        private readonly GeminiService $gemini,
    ) {}

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:4000'],
            'context' => ['nullable', 'array'],
        ]);

        $message = trim($validated['message']);
        $context = $validated['context'] ?? [];

        $prompt = $this->buildPrompt($message, $context);

        try {
            $reply = $this->gemini->generate($prompt);
        } catch (RuntimeException $e) {
            $status = str_contains($e->getMessage(), 'not configured') ? 503 : 502;

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $status);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'reply' => $reply,
            ],
        ]);
    }

  /**
   * @param  array<string, mixed>  $context
   */
    private function buildPrompt(string $message, array $context): string
    {
        $analytics = json_encode($context['analytics'] ?? [], JSON_PRETTY_PRINT);
        $promotions = json_encode($context['promotions'] ?? [], JSON_PRETTY_PRINT);
        $candidates = json_encode($context['candidates'] ?? [], JSON_PRETTY_PRINT);

        return <<<PROMPT
You are an AI HR Advisor for CareerHub.
Here is the current analytics data of our candidates:
{$analytics}

Here is the list of promotions:
{$promotions}

Here is the list of candidates:
{$candidates}

The user is asking: "{$message}"

Provide a helpful, concise, and data-driven response based strictly on the provided data. Use markdown formatting.
PROMPT;
    }
}
