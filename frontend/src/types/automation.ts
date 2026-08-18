// Human-readable labels rendered by StatusChip.
export type AutomationType = 'UI' | 'API' | 'Unit' | 'Integration' | 'Performance';
export type AutomationFramework =
  | 'Playwright'
  | 'Selenium'
  | 'Cypress'
  | 'Jest'
  | 'Postman'
  | 'Other';
export type AutomationRunStatus = 'Pass' | 'Fail' | 'Blocked' | 'Not Run';

// Raw Prisma enum values as returned by the backend.
export type ApiAutomationType = 'UI' | 'API' | 'UNIT' | 'INTEGRATION' | 'PERFORMANCE';
export type ApiAutomationFramework =
  | 'PLAYWRIGHT'
  | 'SELENIUM'
  | 'CYPRESS'
  | 'JEST'
  | 'POSTMAN'
  | 'OTHER';
export type ApiAutomationRunStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';

export interface ApiAutomationCaseRef {
  id: string;
  title: string;
}

export interface ApiAutomationEnvironmentRef {
  id: string;
  name: string;
}

export interface ApiAutomationRun {
  id: string;
  automationId: string;
  status: ApiAutomationRunStatus;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  recordedBy: string;
  createdAt: string;
}

// The list endpoint deliberately omits the full run history -- it only
// returns a run count badge. See ApiAutomation below for the single-record
// detail shape that carries the complete `runs` array.
export interface ApiAutomationListItem {
  id: string;
  testCaseId: string;
  environmentId: string | null;
  name: string;
  type: ApiAutomationType;
  framework: ApiAutomationFramework;
  description: string | null;
  schedule: string | null;
  enabled: boolean;
  lastRunStatus: ApiAutomationRunStatus;
  lastRunAt: string | null;
  lastRunNotes: string | null;
  createdAt: string;
  updatedAt: string;
  testCase: ApiAutomationCaseRef;
  environment: ApiAutomationEnvironmentRef | null;
  runCount: number;
}

export interface ApiAutomation extends ApiAutomationListItem {
  runs: ApiAutomationRun[];
}

export interface CreateAutomationPayload {
  testCaseId: string;
  environmentId?: string;
  name: string;
  type?: ApiAutomationType;
  framework?: ApiAutomationFramework;
  description?: string;
  // Free text, e.g. "Nightly at 2am" or "On every deploy" -- descriptive
  // metadata only, there is no real job scheduler behind this field.
  schedule?: string;
  enabled?: boolean;
}

export type UpdateAutomationPayload = Partial<CreateAutomationPayload>;

export interface CreateAutomationRunPayload {
  status: ApiAutomationRunStatus;
  startedAt: string;
  finishedAt?: string;
  notes?: string;
  recordedBy: string;
}
