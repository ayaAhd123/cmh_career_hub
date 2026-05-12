export interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
}

export interface AnalyzeDataResponse {
  data?: AnalysisResult;
  error?: string;
  loading: boolean;
}

export async function analyzeData(data: unknown, question: string): Promise<AnalyzeDataResponse> {
  const endpoint = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/ai/analyze`.replace(/([^:]\/\/)\//, '$1');

  const payload = {
    data,
    question,
  };

  const result: AnalyzeDataResponse = {
    loading: true,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok || json.success === false) {
      result.loading = false;
      result.error = json.message || 'Failed to analyze data.';
      return result;
    }

    result.loading = false;
    result.data = json.data as AnalysisResult;
    return result;
  } catch (error) {
    result.loading = false;
    result.error = error instanceof Error ? error.message : 'Network or parsing error.';
    return result;
  }
}
