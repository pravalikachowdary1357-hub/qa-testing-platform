import type { ApiReleaseRef } from './release';

// Human-readable labels rendered by StatusChip.
export type TestCasePriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TestCaseStatus = 'Draft' | 'Ready' | 'Approved' | 'Deprecated';

// Raw Prisma enum values as returned by the backend.
export type ApiTestCasePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ApiTestCaseStatus = 'DRAFT' | 'READY' | 'APPROVED' | 'DEPRECATED';

export interface ApiTestCaseScenarioRef {
  id: string;
  title: string;
}

export interface ApiTestCaseStep {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface ApiTestCase {
  id: string;
  testScenarioId: string;
  title: string;
  description: string;
  preconditions: string | null;
  expectedResult: string;
  priority: ApiTestCasePriority;
  status: ApiTestCaseStatus;
  releaseId: string | null;
  release: ApiReleaseRef | null;
  createdAt: string;
  updatedAt: string;
  testScenario: ApiTestCaseScenarioRef;
  steps: ApiTestCaseStep[];
}

export interface TestCaseStepInput {
  action: string;
  expectedResult: string;
}

export interface CreateTestCasePayload {
  testScenarioId: string;
  title: string;
  description: string;
  preconditions?: string;
  expectedResult: string;
  priority?: ApiTestCasePriority;
  status?: ApiTestCaseStatus;
  releaseId?: string;
  steps: TestCaseStepInput[];
}

export type UpdateTestCasePayload = Partial<CreateTestCasePayload>;
