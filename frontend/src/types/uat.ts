export type UatCycleStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
export type UatCycleStatusLabel = 'Planned' | 'In Progress' | 'Completed' | 'Approved' | 'Rejected';

export const CYCLE_STATUS_LABELS: Record<UatCycleStatus, UatCycleStatusLabel> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Only these three are settable via a plain edit -- APPROVED/REJECTED
// require the dedicated sign-off action (see SignOffDialog).
export const EDITABLE_CYCLE_STATUSES: UatCycleStatus[] = ['PLANNED', 'IN_PROGRESS', 'COMPLETED'];

export type UatExecutionStatus = 'NOT_RUN' | 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_APPLICABLE';
export type UatExecutionStatusLabel = 'Not Run' | 'Pass' | 'Fail' | 'Blocked' | 'Not Applicable';

export const EXECUTION_STATUS_LABELS: Record<UatExecutionStatus, UatExecutionStatusLabel> = {
  NOT_RUN: 'Not Run',
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
  NOT_APPLICABLE: 'Not Applicable',
};

export const ALL_EXECUTION_STATUSES: UatExecutionStatus[] = [
  'NOT_RUN',
  'PASS',
  'FAIL',
  'BLOCKED',
  'NOT_APPLICABLE',
];

export interface UatSummary {
  notRun: number;
  pass: number;
  fail: number;
  blocked: number;
  notApplicable: number;
}

export interface UatProductRef {
  id: string;
  name: string;
}

export interface UatRequirementRef {
  id: string;
  title: string;
}

export interface UatEnvironmentRef {
  id: string;
  name: string;
}

export interface UatDefectRef {
  id: string;
  title: string;
  status: string;
}

export interface UatTestCaseStep {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface UatTestCaseStepInput {
  action: string;
  expectedResult: string;
}

export interface UatExecution {
  id: string;
  uatTestCaseId: string;
  environmentId: string;
  defectId: string | null;
  status: UatExecutionStatus;
  actualResult: string | null;
  notes: string | null;
  evidence: string | null;
  executedBy: string;
  executedAt: string;
  createdAt: string;
  updatedAt: string;
  environment: UatEnvironmentRef;
  defect: UatDefectRef | null;
}

export interface UatTestCase {
  id: string;
  uatCycleId: string;
  requirementId: string | null;
  title: string;
  description: string | null;
  expectedResult: string;
  assignedTester: string;
  createdAt: string;
  updatedAt: string;
  requirement: UatRequirementRef | null;
  steps: UatTestCaseStep[];
  executions: UatExecution[];
}

export interface UatCycleListItem {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  status: UatCycleStatus;
  signOffBy: string | null;
  signOffAt: string | null;
  signOffNotes: string | null;
  createdAt: string;
  updatedAt: string;
  product: UatProductRef;
  testCaseCount: number;
  summary: UatSummary;
}

export interface UatCycle extends UatCycleListItem {
  testCases: UatTestCase[];
}

export interface CreateUatCyclePayload {
  productId: string;
  name: string;
  description?: string;
}

export interface UpdateUatCyclePayload {
  productId?: string;
  name?: string;
  description?: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface SignOffUatCyclePayload {
  decision: 'APPROVED' | 'REJECTED';
  signOffBy: string;
  notes?: string;
}

export interface CreateUatTestCasePayload {
  requirementId?: string;
  title: string;
  description?: string;
  expectedResult: string;
  assignedTester: string;
  steps: UatTestCaseStepInput[];
}

export type UpdateUatTestCasePayload = Partial<CreateUatTestCasePayload>;

export interface CreateUatExecutionPayload {
  environmentId: string;
  defectId?: string;
  status?: UatExecutionStatus;
  actualResult?: string;
  notes?: string;
  evidence?: string;
  executedBy: string;
  executedAt?: string;
}

export type UpdateUatExecutionPayload = Partial<CreateUatExecutionPayload>;
