import type { ApiEnvironmentType } from './environment';
import type { ApiTestExecutionStatus } from './testExecution';
import type { ApiReleaseRef } from './release';

// Human-readable labels rendered by StatusChip.
export type DefectSeverity = 'Critical' | 'Major' | 'Minor' | 'Trivial';
export type DefectPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type DefectStatus = 'Open' | 'In Progress' | 'Resolved' | 'Reopened' | 'Closed';

// Raw Prisma enum values as returned by the backend.
export type ApiDefectSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'TRIVIAL';
export type ApiDefectPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ApiDefectStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED' | 'CLOSED';

export interface ApiDefectProductRef {
  id: string;
  name: string;
}

export interface ApiDefectEnvironmentRef {
  id: string;
  name: string;
  type: ApiEnvironmentType;
}

export interface ApiDefectTestCaseRef {
  id: string;
  title: string;
}

export interface ApiDefectTestExecutionRef {
  id: string;
  status: ApiTestExecutionStatus;
  executedAt: string;
}

export interface ApiDefect {
  id: string;
  productId: string;
  releaseId: string | null;
  environmentId: string | null;
  testCaseId: string | null;
  testExecutionId: string | null;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: ApiDefectSeverity;
  priority: ApiDefectPriority;
  status: ApiDefectStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  product: ApiDefectProductRef;
  release: ApiReleaseRef | null;
  environment: ApiDefectEnvironmentRef | null;
  testCase: ApiDefectTestCaseRef | null;
  testExecution: ApiDefectTestExecutionRef | null;
}

export interface CreateDefectPayload {
  productId: string;
  releaseId?: string;
  // null and undefined both mean "no link"; PATCH also uses null to
  // explicitly clear an existing link.
  environmentId?: string | null;
  testCaseId?: string | null;
  testExecutionId?: string | null;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity?: ApiDefectSeverity;
  priority?: ApiDefectPriority;
  status?: ApiDefectStatus;
  assignedTo?: string;
}

export type UpdateDefectPayload = Partial<CreateDefectPayload>;
