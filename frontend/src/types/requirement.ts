import type { ApiReleaseRef } from './release';

// Human-readable labels rendered by StatusChip.
export type RequirementType = 'Functional' | 'Non-Functional' | 'Business' | 'Technical';
export type RequirementPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type RequirementStatus = 'Draft' | 'Approved' | 'Implemented' | 'Verified' | 'Rejected';

// Raw Prisma enum values as returned by the backend.
export type ApiRequirementType = 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUSINESS' | 'TECHNICAL';
export type ApiRequirementPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ApiRequirementStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'IMPLEMENTED'
  | 'VERIFIED'
  | 'REJECTED';

export interface ApiRequirementProductRef {
  id: string;
  name: string;
}

export interface ApiRequirement {
  id: string;
  productId: string;
  releaseId: string | null;
  title: string;
  description: string;
  type: ApiRequirementType;
  priority: ApiRequirementPriority;
  status: ApiRequirementStatus;
  createdAt: string;
  updatedAt: string;
  product: ApiRequirementProductRef;
  release: ApiReleaseRef | null;
}

export interface CreateRequirementPayload {
  productId: string;
  releaseId?: string;
  title: string;
  description: string;
  type?: ApiRequirementType;
  priority?: ApiRequirementPriority;
  status?: ApiRequirementStatus;
}

export type UpdateRequirementPayload = Partial<CreateRequirementPayload>;
