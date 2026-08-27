import type { ApiEnvironmentType } from './environment';
import type { ApiReleaseRef } from './release';

// Human-readable labels rendered by StatusChip.
export type TestExecutionStatus = 'Pending' | 'Pass' | 'Fail' | 'Blocked';

// Raw Prisma enum values as returned by the backend.
export type ApiTestExecutionStatus = 'PENDING' | 'PASS' | 'FAIL' | 'BLOCKED';

export interface ApiTestExecutionProductRef {
  id: string;
  name: string;
}

export interface ApiTestExecutionScenarioRef {
  id: string;
  title: string;
  product: ApiTestExecutionProductRef;
}

export interface ApiTestExecutionCaseRef {
  id: string;
  title: string;
  expectedResult: string;
  testScenario: ApiTestExecutionScenarioRef;
}

export interface ApiTestExecutionEnvironmentRef {
  id: string;
  name: string;
  type: ApiEnvironmentType;
}

export interface ApiTestExecutionDataRef {
  id: string;
  name: string;
}

export interface ApiTestExecution {
  id: string;
  testCaseId: string;
  environmentId: string;
  testDataId: string | null;
  status: ApiTestExecutionStatus;
  actualResult: string | null;
  notes: string | null;
  executedBy: string;
  executedAt: string;
  releaseId: string | null;
  release: ApiReleaseRef | null;
  createdAt: string;
  updatedAt: string;
  testCase: ApiTestExecutionCaseRef;
  environment: ApiTestExecutionEnvironmentRef;
  testData: ApiTestExecutionDataRef | null;
}

export interface CreateTestExecutionPayload {
  testCaseId: string;
  environmentId: string;
  // null and undefined both mean "no test data"; PATCH also uses null to
  // explicitly clear an existing link.
  testDataId?: string | null;
  releaseId?: string;
  status?: ApiTestExecutionStatus;
  actualResult?: string;
  notes?: string;
  executedBy: string;
  executedAt?: string;
}

export type UpdateTestExecutionPayload = Partial<CreateTestExecutionPayload>;
