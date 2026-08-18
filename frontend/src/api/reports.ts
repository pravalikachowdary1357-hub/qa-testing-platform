import { apiFetch } from './client';
import type { ReportFilterParams } from '../types/reports';
import type {
  ApiTestingReport,
  AutomationReport,
  DefectReport,
  OverviewReport,
  PerformanceReport,
  RequirementCoverageReport,
  ReleaseQualityReport,
  SecurityReport,
  TestCaseStatusReport,
  TestExecutionReport,
  TraceabilityReport,
  UatReport,
} from '../types/reports';

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function fetchOverviewReport(filters: ReportFilterParams): Promise<OverviewReport> {
  return apiFetch<OverviewReport>(`/reports/overview${buildQuery({ ...filters })}`);
}

export function fetchTestExecutionReport(filters: ReportFilterParams, status?: string): Promise<TestExecutionReport> {
  return apiFetch<TestExecutionReport>(`/reports/test-executions${buildQuery({ ...filters, status })}`);
}

export function fetchTestCaseStatusReport(
  filters: ReportFilterParams,
  lifecycleStatus?: string,
  resultStatus?: string,
): Promise<TestCaseStatusReport> {
  return apiFetch<TestCaseStatusReport>(
    `/reports/test-case-status${buildQuery({ ...filters, lifecycleStatus, resultStatus })}`,
  );
}

export function fetchRequirementCoverageReport(filters: ReportFilterParams): Promise<RequirementCoverageReport> {
  return apiFetch<RequirementCoverageReport>(
    `/reports/requirement-coverage${buildQuery({ productId: filters.productId })}`,
  );
}

export function fetchTraceabilityReport(filters: ReportFilterParams): Promise<TraceabilityReport> {
  return apiFetch<TraceabilityReport>(`/reports/traceability${buildQuery({ productId: filters.productId })}`);
}

export function fetchDefectReport(filters: ReportFilterParams, status?: string, severity?: string): Promise<DefectReport> {
  return apiFetch<DefectReport>(`/reports/defects${buildQuery({ ...filters, status, severity })}`);
}

export function fetchAutomationReport(filters: ReportFilterParams, status?: string): Promise<AutomationReport> {
  return apiFetch<AutomationReport>(`/reports/automation${buildQuery({ ...filters, status })}`);
}

export function fetchApiTestingReport(filters: ReportFilterParams, status?: string): Promise<ApiTestingReport> {
  return apiFetch<ApiTestingReport>(`/reports/api-testing${buildQuery({ ...filters, status })}`);
}

export function fetchPerformanceReport(filters: ReportFilterParams, status?: string): Promise<PerformanceReport> {
  return apiFetch<PerformanceReport>(`/reports/performance${buildQuery({ ...filters, status })}`);
}

export function fetchSecurityReport(filters: ReportFilterParams, status?: string, severity?: string): Promise<SecurityReport> {
  return apiFetch<SecurityReport>(`/reports/security${buildQuery({ ...filters, status, severity })}`);
}

export function fetchUatReport(filters: ReportFilterParams, status?: string): Promise<UatReport> {
  return apiFetch<UatReport>(`/reports/uat${buildQuery({ ...filters, status })}`);
}

export function fetchReleaseQualityReport(
  filters: ReportFilterParams,
  status?: string,
  readiness?: string,
): Promise<ReleaseQualityReport> {
  return apiFetch<ReleaseQualityReport>(`/reports/release-quality${buildQuery({ ...filters, status, readiness })}`);
}
