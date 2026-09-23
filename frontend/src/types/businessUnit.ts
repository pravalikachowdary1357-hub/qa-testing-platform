import type { ApiOrganizationStatus, OrganizationStatus } from './organization';

export const BUSINESS_UNIT_STATUS_LABELS: Record<ApiOrganizationStatus, OrganizationStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export interface ApiBusinessUnitOrganizationRef {
  id: string;
  name: string;
}

export interface ApiBusinessUnit {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: ApiOrganizationStatus;
  organization: ApiBusinessUnitOrganizationRef;
  _count: { projects: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessUnitPayload {
  organizationId: string;
  name: string;
  description?: string;
  status?: ApiOrganizationStatus;
}

export type UpdateBusinessUnitPayload = Partial<CreateBusinessUnitPayload>;
