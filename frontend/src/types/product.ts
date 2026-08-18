export type ProductStatus = 'Active' | 'On Hold' | 'Deprecated';

export type ReleaseReadiness = 'Ready' | 'Conditional' | 'Not Ready';

// Shape returned by the real backend (GET /products), using the raw
// Prisma enum values rather than the human-readable labels above.
export type ApiProductStatus = 'ACTIVE' | 'ON_HOLD' | 'DEPRECATED';

export type ApiReleaseReadiness = 'READY' | 'CONDITIONAL' | 'NOT_READY';

export interface ApiProductOrganizationRef {
  id: string;
  name: string;
}

export interface ApiProduct {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: ApiProductStatus;
  environment: string;
  release: string;
  testCoverage: number;
  passRate: number;
  openDefects: number;
  releaseReadiness: ApiReleaseReadiness;
  createdAt: string;
  updatedAt: string;
  organization: ApiProductOrganizationRef;
}

export interface CreateProductPayload {
  organizationId: string;
  name: string;
  description: string;
  status?: ApiProductStatus;
  environment: string;
  release: string;
  testCoverage: number;
  passRate: number;
  openDefects?: number;
  releaseReadiness?: ApiReleaseReadiness;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;
