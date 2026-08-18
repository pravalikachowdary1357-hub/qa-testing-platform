import { apiFetch } from './client';
import type {
  AiStatus,
  AnalyzeCoverageResult,
  AnalyzeExecutionResult,
  ApiAiSuggestion,
  ChatMessage,
  ChatResult,
  DuplicateDefectsResult,
  ExplainReleaseRisksResult,
  GenerateScenariosResult,
  GenerateTestCasesResult,
  SuggestDefectSeverityResult,
  SuggestTestDataResult,
  SummarizeDefectResult,
} from '../types/ai';

export function fetchAiStatus(): Promise<AiStatus> {
  return apiFetch<AiStatus>('/ai/status');
}

export function generateScenarios(requirementId: string): Promise<GenerateScenariosResult> {
  return apiFetch<GenerateScenariosResult>('/ai/generate-scenarios', {
    method: 'POST',
    body: JSON.stringify({ requirementId }),
  });
}

export function acceptScenarios(
  suggestionId: string,
  scenarios: Array<{ title: string; description: string; type?: string; priority?: string }>,
  edited: boolean,
): Promise<{ created: unknown[] }> {
  return apiFetch(`/ai/suggestions/${suggestionId}/accept-scenarios`, {
    method: 'POST',
    body: JSON.stringify({ scenarios, edited }),
  });
}

export function generateTestCases(testScenarioId: string): Promise<GenerateTestCasesResult> {
  return apiFetch<GenerateTestCasesResult>('/ai/generate-test-cases', {
    method: 'POST',
    body: JSON.stringify({ testScenarioId }),
  });
}

export function acceptTestCases(
  suggestionId: string,
  testCases: Array<{
    title: string;
    description: string;
    preconditions?: string;
    expectedResult: string;
    priority?: string;
    steps: Array<{ action: string; expectedResult: string }>;
  }>,
  edited: boolean,
): Promise<{ created: unknown[] }> {
  return apiFetch(`/ai/suggestions/${suggestionId}/accept-test-cases`, {
    method: 'POST',
    body: JSON.stringify({ testCases, edited }),
  });
}

export function suggestTestData(testCaseId: string): Promise<SuggestTestDataResult> {
  return apiFetch<SuggestTestDataResult>('/ai/suggest-test-data', {
    method: 'POST',
    body: JSON.stringify({ testCaseId }),
  });
}

export function acceptTestData(
  suggestionId: string,
  testData: Array<{ name: string; description?: string; type?: string; value: string }>,
  edited: boolean,
): Promise<{ created: unknown[] }> {
  return apiFetch(`/ai/suggestions/${suggestionId}/accept-test-data`, {
    method: 'POST',
    body: JSON.stringify({ testData, edited }),
  });
}

export function analyzeExecution(testExecutionId: string): Promise<AnalyzeExecutionResult> {
  return apiFetch<AnalyzeExecutionResult>('/ai/analyze-execution', {
    method: 'POST',
    body: JSON.stringify({ testExecutionId }),
  });
}

export function summarizeDefect(defectId: string): Promise<SummarizeDefectResult> {
  return apiFetch<SummarizeDefectResult>('/ai/summarize-defect', {
    method: 'POST',
    body: JSON.stringify({ defectId }),
  });
}

export function suggestDefectSeverity(defectId: string): Promise<SuggestDefectSeverityResult> {
  return apiFetch<SuggestDefectSeverityResult>('/ai/suggest-defect-severity', {
    method: 'POST',
    body: JSON.stringify({ defectId }),
  });
}

export function applySeverity(
  suggestionId: string,
  data: { severity?: string; priority?: string; edited: boolean },
): Promise<{ updated: unknown }> {
  return apiFetch(`/ai/suggestions/${suggestionId}/apply-severity`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function findDuplicateDefects(productId: string): Promise<DuplicateDefectsResult> {
  return apiFetch<DuplicateDefectsResult>('/ai/duplicate-defects', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export function analyzeCoverage(productId: string): Promise<AnalyzeCoverageResult> {
  return apiFetch<AnalyzeCoverageResult>('/ai/analyze-coverage', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  });
}

export function explainReleaseRisks(releaseId: string): Promise<ExplainReleaseRisksResult> {
  return apiFetch<ExplainReleaseRisksResult>('/ai/explain-release-risks', {
    method: 'POST',
    body: JSON.stringify({ releaseId }),
  });
}

export function sendChatMessage(message: string, history: ChatMessage[]): Promise<ChatResult> {
  return apiFetch<ChatResult>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

export function updateSuggestionStatus(
  suggestionId: string,
  status: 'ACCEPTED' | 'REJECTED',
): Promise<ApiAiSuggestion> {
  return apiFetch<ApiAiSuggestion>(`/ai/suggestions/${suggestionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function fetchAiSuggestions(filters: {
  productId?: string;
  capability?: string;
  status?: string;
}): Promise<ApiAiSuggestion[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return apiFetch<ApiAiSuggestion[]>(`/ai/suggestions${query ? `?${query}` : ''}`);
}

export function deleteAiSuggestion(suggestionId: string): Promise<void> {
  return apiFetch<void>(`/ai/suggestions/${suggestionId}`, { method: 'DELETE' });
}
