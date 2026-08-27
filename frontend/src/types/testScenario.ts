import type { ApiReleaseRef } from './release';

// Human-readable labels rendered by StatusChip.
export type TestScenarioType = 'Functional' | 'Regression' | 'Integration' | 'Smoke' | 'Edge Case';
export type TestScenarioPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TestScenarioStatus = 'Draft' | 'Ready' | 'In Progress' | 'Completed' | 'Blocked';

// Raw Prisma enum values as returned by the backend.
export type ApiTestScenarioType =
  | 'FUNCTIONAL'
  | 'REGRESSION'
  | 'INTEGRATION'
  | 'SMOKE'
  | 'EDGE_CASE';
export type ApiTestScenarioPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ApiTestScenarioStatus = 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface ApiTestScenarioProductRef {
  id: string;
  name: string;
}

export interface ApiTestScenarioRequirementRef {
  id: string;
  title: string;
}

export interface ApiTestScenario {
  id: string;
  productId: string;
  requirementId: string | null;
  releaseId: string | null;
  title: string;
  description: string;
  type: ApiTestScenarioType;
  priority: ApiTestScenarioPriority;
  status: ApiTestScenarioStatus;
  createdAt: string;
  updatedAt: string;
  product: ApiTestScenarioProductRef;
  requirement: ApiTestScenarioRequirementRef | null;
  release: ApiReleaseRef | null;
}

export interface CreateTestScenarioPayload {
  productId: string;
  // null and undefined both mean "no requirement"; PATCH also uses null to
  // explicitly clear an existing link.
  requirementId?: string | null;
  releaseId?: string;
  title: string;
  description: string;
  type?: ApiTestScenarioType;
  priority?: ApiTestScenarioPriority;
  status?: ApiTestScenarioStatus;
}

export type UpdateTestScenarioPayload = Partial<CreateTestScenarioPayload>;
