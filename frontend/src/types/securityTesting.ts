import type { ApiReleaseRef } from './release';

// Raw Prisma enum values as returned by the backend.
export type SecurityTestType =
  | 'SAST'
  | 'DAST'
  | 'PENETRATION_TEST'
  | 'VULNERABILITY_SCAN'
  | 'DEPENDENCY_SCAN'
  | 'CONFIGURATION_AUDIT'
  | 'CODE_REVIEW'
  | 'OTHER';

export type SecurityTestTypeLabel =
  | 'SAST'
  | 'DAST'
  | 'Penetration Test'
  | 'Vulnerability Scan'
  | 'Dependency Scan'
  | 'Configuration Audit'
  | 'Code Review'
  | 'Other';

export const TEST_TYPE_LABELS: Record<SecurityTestType, SecurityTestTypeLabel> = {
  SAST: 'SAST',
  DAST: 'DAST',
  PENETRATION_TEST: 'Penetration Test',
  VULNERABILITY_SCAN: 'Vulnerability Scan',
  DEPENDENCY_SCAN: 'Dependency Scan',
  CONFIGURATION_AUDIT: 'Configuration Audit',
  CODE_REVIEW: 'Code Review',
  OTHER: 'Other',
};

export type SecurityTestStatus = 'NOT_STARTED' | 'RUNNING' | 'PASSED' | 'FAILED';

export type SecurityTestStatusLabel = 'Not Started' | 'Running' | 'Passed' | 'Failed';

export const TEST_STATUS_LABELS: Record<SecurityTestStatus, SecurityTestStatusLabel> = {
  NOT_STARTED: 'Not Started',
  RUNNING: 'Running',
  PASSED: 'Passed',
  FAILED: 'Failed',
};

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFO: 'Info',
};

export const ALL_SEVERITIES: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export type VulnerabilityStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED' | 'ACCEPTED';

export type VulnerabilityStatusLabel =
  | 'Open'
  | 'In Progress'
  | 'Resolved'
  | 'Reopened'
  | 'Accepted';

export const VULN_STATUS_LABELS: Record<VulnerabilityStatus, VulnerabilityStatusLabel> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  ACCEPTED: 'Accepted',
};

export const ALL_VULN_STATUSES: VulnerabilityStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'REOPENED',
  'ACCEPTED',
];

export interface SecurityTestProductRef {
  id: string;
  name: string;
}

export interface SecurityTestEnvironmentRef {
  id: string;
  name: string;
}

export interface SecurityTestTestCaseRef {
  id: string;
  title: string;
}

export interface SecurityFinding {
  id: string;
  securityTestId: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  evidence: string | null;
  recommendation: string;
  status: VulnerabilityStatus;
  discoveredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityTestListItem {
  id: string;
  productId: string;
  environmentId: string | null;
  testCaseId: string | null;
  releaseId: string | null;
  name: string;
  description: string | null;
  target: string;
  testType: SecurityTestType;
  configuration: string | null;
  status: SecurityTestStatus;
  lastExecutedAt: string | null;
  lastRunNotes: string | null;
  createdAt: string;
  updatedAt: string;
  product: SecurityTestProductRef;
  environment: SecurityTestEnvironmentRef | null;
  testCase: SecurityTestTestCaseRef | null;
  release: ApiReleaseRef | null;
  _count: { findings: number };
}

export interface SecurityTest extends SecurityTestListItem {
  findings: SecurityFinding[];
}

export interface CreateSecurityTestPayload {
  productId: string;
  environmentId?: string;
  testCaseId?: string;
  releaseId?: string;
  name: string;
  description?: string;
  target: string;
  testType?: SecurityTestType;
  configuration?: string;
}

export type UpdateSecurityTestPayload = Partial<CreateSecurityTestPayload>;

export interface CompleteSecurityTestPayload {
  status: 'PASSED' | 'FAILED';
  notes?: string;
}

export interface CreateSecurityFindingPayload {
  title: string;
  description: string;
  severity?: FindingSeverity;
  evidence?: string;
  recommendation: string;
  status?: VulnerabilityStatus;
}

export type UpdateSecurityFindingPayload = Partial<CreateSecurityFindingPayload>;

export interface SecurityFindingSummary {
  bySeverity: Record<FindingSeverity, number>;
  byStatus: Record<VulnerabilityStatus, number>;
}
