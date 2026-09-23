import type { ApiProduct } from './product';

// Human-readable labels rendered by StatusChip.
export type ProjectStatus = 'Active' | 'Inactive';

// Raw Prisma enum values as returned by the backend.
export type ApiProjectStatus = 'ACTIVE' | 'INACTIVE';

export interface ApiProjectOrganizationRef {
  id: string;
  name: string;
}

export interface ApiProjectBusinessUnitRef {
  id: string;
  name: string;
}

// Shape returned by GET /projects (and by create/update). Unlike
// OrganizationsService, ProjectsService does not flatten `_count` into a
// top-level `productCount` field -- findAll/findOne/create/update all return
// the raw Prisma include result, so the product count stays nested under
// `_count.products`.
export interface ApiProject {
  id: string;
  organizationId: string;
  businessUnitId: string | null;
  name: string;
  description: string | null;
  status: ApiProjectStatus;
  createdAt: string;
  updatedAt: string;
  organization: ApiProjectOrganizationRef;
  businessUnit: ApiProjectBusinessUnitRef | null;
  _count: { products: number };
}

// Shape returned by GET /projects/:id, which additionally includes the
// project's related products.
export interface ApiProjectDetail extends ApiProject {
  products: ApiProduct[];
}

export interface CreateProjectPayload {
  organizationId: string;
  businessUnitId?: string | null;
  name: string;
  description?: string;
  status?: ApiProjectStatus;
}

// null explicitly clears an existing businessUnitId; undefined/omitted
// leaves it untouched -- see UpdateProjectDto on the backend.
export type UpdateProjectPayload = Partial<CreateProjectPayload>;
