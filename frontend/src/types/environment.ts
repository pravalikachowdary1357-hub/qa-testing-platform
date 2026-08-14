// Human-readable labels rendered by StatusChip.
export type EnvironmentType = 'Development' | 'QA' | 'Staging' | 'UAT' | 'Production';
export type EnvironmentStatus = 'Active' | 'Inactive' | 'Maintenance';

// Raw Prisma enum values as returned by the backend.
export type ApiEnvironmentType = 'DEVELOPMENT' | 'QA' | 'STAGING' | 'UAT' | 'PRODUCTION';
export type ApiEnvironmentStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export interface ApiEnvironmentProductRef {
  id: string;
  name: string;
}

export interface ApiEnvironment {
  id: string;
  productId: string;
  name: string;
  type: ApiEnvironmentType;
  status: ApiEnvironmentStatus;
  baseUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  product: ApiEnvironmentProductRef;
}

export interface CreateEnvironmentPayload {
  productId: string;
  name: string;
  type?: ApiEnvironmentType;
  status?: ApiEnvironmentStatus;
  baseUrl?: string;
  description?: string;
}

export type UpdateEnvironmentPayload = Partial<CreateEnvironmentPayload>;
