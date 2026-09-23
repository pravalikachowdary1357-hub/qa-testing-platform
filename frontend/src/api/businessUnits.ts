import { apiFetch } from './client';
import type {
  ApiBusinessUnit,
  CreateBusinessUnitPayload,
  UpdateBusinessUnitPayload,
} from '../types/businessUnit';

export function fetchBusinessUnits(organizationId?: string): Promise<ApiBusinessUnit[]> {
  const query = organizationId ? `?organizationId=${organizationId}` : '';
  return apiFetch<ApiBusinessUnit[]>(`/business-units${query}`);
}

export function fetchBusinessUnit(id: string): Promise<ApiBusinessUnit> {
  return apiFetch<ApiBusinessUnit>(`/business-units/${id}`);
}

export function createBusinessUnit(data: CreateBusinessUnitPayload): Promise<ApiBusinessUnit> {
  return apiFetch<ApiBusinessUnit>('/business-units', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBusinessUnit(
  id: string,
  data: UpdateBusinessUnitPayload,
): Promise<ApiBusinessUnit> {
  return apiFetch<ApiBusinessUnit>(`/business-units/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteBusinessUnit(id: string): Promise<void> {
  return apiFetch<void>(`/business-units/${id}`, { method: 'DELETE' });
}
