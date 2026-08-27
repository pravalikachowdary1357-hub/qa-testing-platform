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

export interface ApiProductOwnerRef {
  id: string;
  name: string;
  email: string;
}

export interface ApiProduct {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: ApiProductStatus;
  environment: string;
  release: string;
  applicationUrl: string | null;
  repositoryUrl: string | null;
  productOwnerId: string | null;
  currentVersion: string | null;
  testCoverage: number;
  passRate: number;
  openDefects: number;
  releaseReadiness: ApiReleaseReadiness;
  createdAt: string;
  updatedAt: string;
  organization: ApiProductOrganizationRef;
  productOwner: ApiProductOwnerRef | null;
}

export interface CreateProductPayload {
  organizationId: string;
  name: string;
  description: string;
  status?: ApiProductStatus;
  environment: string;
  release: string;
  applicationUrl?: string;
  repositoryUrl?: string;
  productOwnerId?: string;
  currentVersion?: string;
  testCoverage: number;
  passRate: number;
  openDefects?: number;
  releaseReadiness?: ApiReleaseReadiness;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface ApiProductComponent {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface CreateProductComponentPayload {
  productId: string;
  name: string;
  description?: string;
}

export interface ApiProductTeamMember {
  id: string;
  productId: string;
  userId: string;
  responsibility: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateProductTeamMemberPayload {
  productId: string;
  userId: string;
  responsibility?: string;
}
