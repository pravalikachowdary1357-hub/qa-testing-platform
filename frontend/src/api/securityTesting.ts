import { apiFetch } from './client';
import type {
  CompleteSecurityTestPayload,
  CreateSecurityFindingPayload,
  CreateSecurityTestPayload,
  SecurityFinding,
  SecurityFindingSummary,
  SecurityTest,
  SecurityTestListItem,
  UpdateSecurityFindingPayload,
  UpdateSecurityTestPayload,
} from '../types/securityTesting';

export function fetchSecurityTests(productId?: string): Promise<SecurityTestListItem[]> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<SecurityTestListItem[]>(`/security-tests${qs}`);
}

export function fetchSecurityTestsSummary(productId?: string): Promise<SecurityFindingSummary> {
  const qs = productId ? `?productId=${productId}` : '';
  return apiFetch<SecurityFindingSummary>(`/security-tests/summary${qs}`);
}

export function fetchSecurityTest(id: string): Promise<SecurityTest> {
  return apiFetch<SecurityTest>(`/security-tests/${id}`);
}

export function createSecurityTest(data: CreateSecurityTestPayload): Promise<SecurityTestListItem> {
  return apiFetch<SecurityTestListItem>('/security-tests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSecurityTest(
  id: string,
  data: UpdateSecurityTestPayload,
): Promise<SecurityTestListItem> {
  return apiFetch<SecurityTestListItem>(`/security-tests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSecurityTest(id: string): Promise<void> {
  return apiFetch<void>(`/security-tests/${id}`, { method: 'DELETE' });
}

export function executeSecurityTest(id: string): Promise<SecurityTestListItem> {
  return apiFetch<SecurityTestListItem>(`/security-tests/${id}/execute`, { method: 'POST' });
}

export function completeSecurityTest(
  id: string,
  data: CompleteSecurityTestPayload,
): Promise<SecurityTestListItem> {
  return apiFetch<SecurityTestListItem>(`/security-tests/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function addSecurityFinding(
  testId: string,
  data: CreateSecurityFindingPayload,
): Promise<SecurityFinding> {
  return apiFetch<SecurityFinding>(`/security-tests/${testId}/findings`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSecurityFinding(
  testId: string,
  findingId: string,
  data: UpdateSecurityFindingPayload,
): Promise<SecurityFinding> {
  return apiFetch<SecurityFinding>(`/security-tests/${testId}/findings/${findingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSecurityFinding(testId: string, findingId: string): Promise<void> {
  return apiFetch<void>(`/security-tests/${testId}/findings/${findingId}`, { method: 'DELETE' });
}
