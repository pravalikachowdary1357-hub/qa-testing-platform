import type { ApiProductStatus } from './product';

// Human-readable labels rendered by StatusChip.
export type OrganizationStatus = 'Active' | 'Inactive';

// Raw Prisma enum values as returned by the backend.
export type ApiOrganizationStatus = 'ACTIVE' | 'INACTIVE';

export interface ApiOrganization {
  id: string;
  name: string;
  orgKey: string | null;
  description: string | null;
  status: ApiOrganizationStatus;
  orgReferenceId: string | null;
  location: string | null;
  establishedYear: number | null;
  email: string | null;
  hasLogo: boolean;
  productCount: number;
  projectCount: number;
  businessUnitCount: number;
  teamCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrganizationProduct {
  id: string;
  name: string;
  status: ApiProductStatus;
}

// Shape returned by GET /organizations/:id, which additionally includes
// the organization's related products.
export interface ApiOrganizationDetail extends ApiOrganization {
  products: ApiOrganizationProduct[];
}

export interface ApiOrganizationDocument {
  id: string;
  organizationId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface CreateOrganizationPayload {
  name: string;
  orgKey?: string;
  description?: string;
  status?: ApiOrganizationStatus;
  orgReferenceId?: string;
  location?: string;
  establishedYear?: number;
  email?: string;
}

export type UpdateOrganizationPayload = Partial<CreateOrganizationPayload>;
