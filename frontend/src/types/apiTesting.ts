// HTTP methods read fine as-is in the UI, so no separate human-label union
// is needed for them (unlike most other enums in this codebase).
export type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Raw Prisma enum values as returned by the backend.
export type ApiAuthType = 'NONE' | 'BEARER' | 'BASIC' | 'API_KEY';

// Human-readable labels for ApiAuthType, used in form selects.
export type AuthTypeLabel = 'None' | 'Bearer' | 'Basic' | 'API Key';

export interface ApiTestRequestProductRef {
  id: string;
  name: string;
}

export interface ApiTestRequestEnvironmentRef {
  id: string;
  name: string;
  baseUrl: string | null;
}

export interface ApiTestExecution {
  id: string;
  apiRequestId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  passed: boolean | null;
  errorMessage: string | null;
  executedAt: string;
}

// The small subset of ApiTestExecution shown in the list view's "last
// result" glance column.
export interface ApiTestExecutionSummary {
  id: string;
  statusCode: number | null;
  passed: boolean | null;
  responseTimeMs: number | null;
  executedAt: string;
}

// The list endpoint deliberately omits `authConfig` -- it may hold sensitive
// content (bearer tokens, basic-auth passwords, API key values) and is only
// returned by the single-record detail endpoint. See ApiTestRequest below.
export interface ApiTestRequestListItem {
  id: string;
  productId: string;
  environmentId: string | null;
  name: string;
  method: ApiHttpMethod;
  url: string;
  headers: Record<string, string> | null;
  queryParams: Record<string, string> | null;
  body: string | null;
  authType: ApiAuthType;
  expectedStatus: number | null;
  createdAt: string;
  updatedAt: string;
  product: ApiTestRequestProductRef;
  environment: ApiTestRequestEnvironmentRef | null;
  lastExecution: ApiTestExecutionSummary | null;
}

export interface ApiTestRequest extends ApiTestRequestListItem {
  authConfig: Record<string, string> | null;
  executions: ApiTestExecution[];
}

export interface CreateApiTestRequestPayload {
  productId: string;
  environmentId?: string;
  name: string;
  method?: ApiHttpMethod;
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: string;
  authType?: ApiAuthType;
  authConfig?: Record<string, string>;
  expectedStatus?: number;
}

export type UpdateApiTestRequestPayload = Partial<CreateApiTestRequestPayload>;
