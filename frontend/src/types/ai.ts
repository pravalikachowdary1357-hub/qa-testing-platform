export interface AiStatus {
  configured: boolean;
  featuresEnabled: boolean;
  model: string | null;
}

export interface AiSourceContext {
  type: string;
  id: string;
  title: string;
  product?: { id: string; name: string } | null;
}

export interface AiScenarioSuggestionItem {
  title: string;
  description: string;
  type?: string;
  priority?: string;
}

export interface GenerateScenariosResult {
  suggestionId: string;
  scenarios: AiScenarioSuggestionItem[];
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface AiTestCaseStepItem {
  action: string;
  expectedResult: string;
}

export interface AiTestCaseSuggestionItem {
  title: string;
  description: string;
  preconditions?: string | null;
  expectedResult: string;
  priority?: string;
  steps: AiTestCaseStepItem[];
}

export interface GenerateTestCasesResult {
  suggestionId: string;
  testCases: AiTestCaseSuggestionItem[];
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface AiTestDataSuggestionItem {
  name: string;
  description?: string | null;
  type?: string;
  value: string;
}

export interface SuggestTestDataResult {
  suggestionId: string;
  testData: AiTestDataSuggestionItem[];
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface AnalyzeExecutionResult {
  suggestionId: string;
  analysis: string;
  likelyRootCause: string;
  suggestedNextSteps: string[];
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface SummarizeDefectResult {
  suggestionId: string;
  summary: string;
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface SuggestDefectSeverityResult {
  suggestionId: string;
  currentSeverity: string;
  currentPriority: string;
  suggestedSeverity: string | null;
  suggestedPriority: string | null;
  reasoning: string;
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface DuplicateDefectPair {
  defectAId: string;
  defectATitle: string;
  defectBId: string;
  defectBTitle: string;
  similarityPercent: number;
}

export interface DuplicateDefectsResult {
  suggestionId: string;
  method: 'heuristic-text-similarity';
  totalDefectsScanned: number;
  pairs: DuplicateDefectPair[];
  truncated: boolean;
}

export interface CoverageData {
  totalRequirements: number;
  coveredRequirements: number;
  requirementCoveragePercent: number;
  uncoveredRequirementTitles: string[];
  totalTestCases: number;
  executedTestCases: number;
  testCoveragePercent: number;
  passRatePercent: number;
  failCount: number;
}

export interface AnalyzeCoverageResult {
  suggestionId: string;
  coverageData: CoverageData;
  narrative: string;
  topRisks: string[];
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface AiQualityGate {
  key: string;
  label: string;
  impact: 'BLOCKING' | 'WARNING';
  passed: boolean;
  detail: string;
}

export interface ExplainReleaseRisksResult {
  suggestionId: string;
  readiness: string;
  gates: AiQualityGate[];
  narrative: string;
  prioritizedActions: string[];
  rawResponse: string;
  sourceContext: AiSourceContext;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  suggestionId: string;
  reply: string;
}

export type AiCapability =
  | 'GENERATE_TEST_SCENARIOS'
  | 'GENERATE_TEST_CASES'
  | 'SUGGEST_TEST_DATA'
  | 'ANALYZE_EXECUTION'
  | 'SUMMARIZE_DEFECT'
  | 'SUGGEST_DEFECT_SEVERITY'
  | 'DUPLICATE_DEFECTS'
  | 'ANALYZE_COVERAGE'
  | 'EXPLAIN_RELEASE_RISKS'
  | 'CHAT';

export type AiSuggestionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EDITED_AND_ACCEPTED';

export interface ApiAiSuggestion {
  id: string;
  capability: AiCapability;
  sourceType: string | null;
  sourceId: string | null;
  productId: string | null;
  prompt: string;
  response: string;
  status: AiSuggestionStatus;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string } | null;
}
