import type { ApiRequirementStatus } from './requirement';
import type { ApiReleaseRef } from './release';

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

export type ApiTestLevel =
  | 'UNIT'
  | 'INTEGRATION'
  | 'SYSTEM'
  | 'SYSTEM_INTEGRATION'
  | 'ACCEPTANCE';
export type ApiTestType =
  | 'FUNCTIONAL'
  | 'REGRESSION'
  | 'SMOKE'
  | 'SANITY'
  | 'API'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'USABILITY'
  | 'COMPATIBILITY'
  | 'ACCESSIBILITY'
  | 'DATA_MIGRATION'
  | 'UAT';

export interface TestPlanMilestone {
  name: string;
  dueDate?: string | null;
  done?: boolean;
}

// Test strategy & governance fields owned by the Test Manager.
export interface TestPlanGovernance {
  isMaster?: boolean;
  scope?: string;
  objectives?: string;
  testLevels?: ApiTestLevel[];
  testTypes?: ApiTestType[];
  approach?: string;
  entryCriteria?: string;
  exitCriteria?: string;
  estimatedEffortHours?: number | null;
  resources?: string;
  risks?: string;
  milestones?: TestPlanMilestone[];
}

export interface ApiUserRef {
  id: string;
  name: string;
}

export interface ApiTestPlan {
  id: string;
  productId: string;
  releaseId: string | null;
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
  release: ApiReleaseRef | null;
  requirements: ApiTestPlanRequirementRef[];
  isMaster: boolean;
  scope: string | null;
  objectives: string | null;
  testLevels: ApiTestLevel[];
  testTypes: ApiTestType[];
  approach: string | null;
  entryCriteria: string | null;
  exitCriteria: string | null;
  estimatedEffortHours: number | null;
  resources: string | null;
  risks: string | null;
  milestones: TestPlanMilestone[];
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  reviewedBy: ApiUserRef | null;
  completedById: string | null;
  completedAt: string | null;
  completionSummary: string | null;
  completedBy: ApiUserRef | null;
}

export type TestPlanReviewDecision = 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REWORK';

export interface TestPlanSummaryReport {
  generatedAt: string;
  scopeBasis: 'REQUIREMENTS' | 'RELEASE' | 'PRODUCT';
  plan: ApiTestPlan;
  requirements: { total: number; covered: number; coveragePercent: number };
  testCases: { total: number; byStatus: Record<string, number> };
  execution: {
    total: number;
    pass: number;
    fail: number;
    blocked: number;
    notRun: number;
    executed: number;
    completionPercent: number;
    passRatePercent: number;
  };
  defects: {
    total: number;
    open: number;
    openBySeverity: Record<string, number>;
    criticalOpen: { id: string; title: string; severity: string; status: string }[];
  };
  milestones: { total: number; done: number; overdue: number };
}

export interface CreateTestPlanPayload extends TestPlanGovernance {
  productId: string;
  releaseId?: string;
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
