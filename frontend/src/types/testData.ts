// Human-readable labels rendered by StatusChip.
export type TestDataType = 'Input' | 'Expected Output' | 'Credentials' | 'Configuration' | 'Reference';

// Raw Prisma enum values as returned by the backend.
export type ApiTestDataType =
  | 'INPUT'
  | 'EXPECTED_OUTPUT'
  | 'CREDENTIALS'
  | 'CONFIGURATION'
  | 'REFERENCE';

export interface ApiTestDataCaseRef {
  id: string;
  title: string;
}

// The list endpoint deliberately omits `value` -- it may hold sensitive-looking
// content (credentials, tokens) and is only returned by the single-record
// detail endpoint. See ApiTestData below.
export interface ApiTestDataListItem {
  id: string;
  testCaseId: string | null;
  name: string;
  description: string | null;
  type: ApiTestDataType;
  createdAt: string;
  updatedAt: string;
  testCase: ApiTestDataCaseRef | null;
}

export interface ApiTestData extends ApiTestDataListItem {
  value: string;
}

export interface CreateTestDataPayload {
  // null and undefined both mean "no linked test case"; PATCH also uses null
  // to explicitly clear an existing link.
  testCaseId?: string | null;
  name: string;
  description?: string;
  type?: ApiTestDataType;
  value: string;
}

export type UpdateTestDataPayload = Partial<CreateTestDataPayload>;
