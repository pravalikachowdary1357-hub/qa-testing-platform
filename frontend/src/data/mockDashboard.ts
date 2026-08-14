import type { ReleaseReadiness } from '../types/product';

export interface DashboardSummary {
  totalProducts: number;
  activeTestPlans: number;
  testCases: number;
  testsExecuted: number;
  passRate: number;
  failedTests: number;
  blockedTests: number;
  openDefects: number;
  criticalDefects: number;
  testCoverage: number;
  automationCoverage: number;
  releaseReadiness: ReleaseReadiness;
}

// Organization-wide snapshot across all 18 mock products.
export const mockDashboardSummary: DashboardSummary = {
  totalProducts: 18,
  activeTestPlans: 42,
  testCases: 3186,
  testsExecuted: 2740,
  passRate: 88,
  failedTests: 214,
  blockedTests: 96,
  openDefects: 226,
  criticalDefects: 34,
  testCoverage: 73,
  automationCoverage: 61,
  releaseReadiness: 'Conditional',
};
