import { apiFetch } from './client';
import type {
  ApiTestExecution,
  ApiTestExecutionSummary,
  ApiTestRequest,
  ApiTestRequestListItem,
  CreateApiTestRequestPayload,
  UpdateApiTestRequestPayload,
} from '../types/apiTesting';

// Wire shapes exactly mirroring what the backend sends over HTTP (see
// ApiTestingService's findAll/findOne/create/update). These are reshaped
// below into the friendlier `lastExecution` (singular, list view) /
// `executions` (full history, detail view) fields used by the frontend.
type ApiTestRequestBaseWire = Omit<ApiTestRequestListItem, 'lastExecution'>;

interface ApiTestRequestListWire extends ApiTestRequestBaseWire {
  executions: ApiTestExecutionSummary[];
}

interface ApiTestRequestDetailWire extends ApiTestRequestBaseWire {
  authConfig: Record<string, string> | null;
  executions: ApiTestExecution[];
}

interface ApiTestRequestMutationWire extends ApiTestRequestBaseWire {
  authConfig: Record<string, string> | null;
}

function baseFields(wire: ApiTestRequestBaseWire): ApiTestRequestBaseWire {
  return {
    id: wire.id,
    productId: wire.productId,
    environmentId: wire.environmentId,
    releaseId: wire.releaseId,
    name: wire.name,
    method: wire.method,
    url: wire.url,
    headers: wire.headers,
    queryParams: wire.queryParams,
    body: wire.body,
    authType: wire.authType,
    expectedStatus: wire.expectedStatus,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    product: wire.product,
    environment: wire.environment,
    release: wire.release,
  };
}

function toSummary(execution: ApiTestExecution): ApiTestExecutionSummary {
  return {
    id: execution.id,
    statusCode: execution.statusCode,
    passed: execution.passed,
    responseTimeMs: execution.responseTimeMs,
    executedAt: execution.executedAt,
  };
}

function toListItem(wire: ApiTestRequestListWire): ApiTestRequestListItem {
  return { ...baseFields(wire), lastExecution: wire.executions[0] ?? null };
}

function toDetail(wire: ApiTestRequestDetailWire): ApiTestRequest {
  const mostRecent = wire.executions[0];
  return {
    ...baseFields(wire),
    authConfig: wire.authConfig,
    executions: wire.executions,
    lastExecution: mostRecent ? toSummary(mostRecent) : null,
  };
}

function toMutationResult(wire: ApiTestRequestMutationWire): ApiTestRequestListItem {
  return { ...baseFields(wire), lastExecution: null };
}

export async function fetchApiTestRequests(productId?: string): Promise<ApiTestRequestListItem[]> {
  const qs = productId ? `?productId=${productId}` : '';
  const data = await apiFetch<ApiTestRequestListWire[]>(`/api-testing${qs}`);
  return data.map(toListItem);
}

export async function fetchApiTestRequest(id: string): Promise<ApiTestRequest> {
  const data = await apiFetch<ApiTestRequestDetailWire>(`/api-testing/${id}`);
  return toDetail(data);
}

export async function createApiTestRequest(
  data: CreateApiTestRequestPayload,
): Promise<ApiTestRequestListItem> {
  const wire = await apiFetch<ApiTestRequestMutationWire>('/api-testing', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return toMutationResult(wire);
}

export async function updateApiTestRequest(
  id: string,
  data: UpdateApiTestRequestPayload,
): Promise<ApiTestRequestListItem> {
  const wire = await apiFetch<ApiTestRequestMutationWire>(`/api-testing/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return toMutationResult(wire);
}

export function deleteApiTestRequest(id: string): Promise<void> {
  return apiFetch<void>(`/api-testing/${id}`, { method: 'DELETE' });
}

export function executeApiTestRequest(id: string): Promise<ApiTestExecution> {
  return apiFetch<ApiTestExecution>(`/api-testing/${id}/execute`, { method: 'POST' });
}
