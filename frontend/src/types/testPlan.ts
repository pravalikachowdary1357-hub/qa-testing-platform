import type { ApiRequirementStatus } from './requirement';

// Human-readable labels rendered by StatusChip.
export type TestPlanStatus =
  | 'Draft'
  | 'In Review'
  | 'Approved'
  | 'Active'
  | 'Completed'
  | 'Archived';
export type TestPlanPriority = 'Critical' | 'High' | 'Medium' | 'Low';

// Raw Prisma enum values as returned by the backend.
export type ApiTestPlanStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED';
export type ApiTestPlanPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ApiTestPlanProductRef {
  id: string;
  name: string;
}

export interface ApiTestPlanRequirementRef {
  id: string;
  title: string;
  status: ApiRequirementStatus;
}

export interface ApiTestPlan {
  id: string;
  productId: string;
  name: string;
  description: string;
  status: ApiTestPlanStatus;
  priority: ApiTestPlanPriority;
  owner: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  product: ApiTestPlanProductRef;
  requirements: ApiTestPlanRequirementRef[];
}

export interface CreateTestPlanPayload {
  productId: string;
  name: string;
  description: string;
  status?: ApiTestPlanStatus;
  priority?: ApiTestPlanPriority;
  owner: string;
  startDate?: string;
  endDate?: string;
  requirementIds?: string[];
}

export type UpdateTestPlanPayload = Partial<CreateTestPlanPayload>;
