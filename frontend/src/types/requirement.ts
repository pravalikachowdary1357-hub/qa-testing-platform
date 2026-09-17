import type { ApiReleaseRef } from './release';

// Human-readable labels rendered by StatusChip.
export type RequirementType = 'Functional' | 'Non-Functional' | 'Business' | 'Technical';
export type RequirementPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type RequirementRisk = 'Low' | 'Medium' | 'High' | 'Critical';
export type RequirementStatus =
  | 'Draft'
  | 'In Review'
  | 'Approved'
  | 'Implemented'
  | 'Verified'
  | 'Rejected';

// Raw Prisma enum values as returned by the backend.
export type ApiRequirementType = 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'BUSINESS' | 'TECHNICAL';
export type ApiRequirementPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ApiRequirementRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ApiRequirementStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'IMPLEMENTED'
  | 'VERIFIED'
  | 'REJECTED';

export interface ApiRequirementProductRef {
  id: string;
  name: string;
}

export interface ApiRequirementUserRef {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ApiRequirementAcceptanceCriterion {
  id: string;
  requirementId: string;
  text: string;
  sortOrder: number;
  createdAt: string;
}

export interface ApiRequirement {
  id: string;
  productId: string;
  releaseId: string | null;
  title: string;
  description: string;
  type: ApiRequirementType;
  priority: ApiRequirementPriority;
  riskLevel: ApiRequirementRisk;
  status: ApiRequirementStatus;
  ownerId: string | null;
  version: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
  product: ApiRequirementProductRef;
  release: ApiReleaseRef | null;
  owner: ApiRequirementUserRef | null;
  // Only present on the single-requirement GET (findOne), not on list rows.
  reviewedBy?: ApiRequirementUserRef | null;
  acceptanceCriteria?: ApiRequirementAcceptanceCriterion[];
}

export interface CreateRequirementPayload {
  productId: string;
  releaseId?: string;
  title: string;
  description: string;
  type?: ApiRequirementType;
  priority?: ApiRequirementPriority;
  riskLevel?: ApiRequirementRisk;
  status?: ApiRequirementStatus;
  ownerId?: string;
  acceptanceCriteria?: string[];
}

export type UpdateRequirementPayload = Partial<CreateRequirementPayload>;

export type ReviewDecision = 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REWORK';

export interface ApiRequirementAttachment {
  id: string;
  requirementId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface RequirementVersionFieldChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface ApiRequirementVersion {
  id: string;
  requirementId: string;
  version: string;
  changedById: string | null;
  changedAt: string;
  summary: string;
  changes: RequirementVersionFieldChange[] | null;
  comment: string | null;
  changedBy: { id: string; name: string; email: string } | null;
}
