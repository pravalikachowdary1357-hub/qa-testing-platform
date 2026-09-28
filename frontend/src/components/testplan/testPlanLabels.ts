import type { ApiTestLevel, ApiTestType } from '../../types/testPlan';

export const TEST_LEVEL_LABELS: Record<ApiTestLevel, string> = {
  UNIT: 'Unit',
  INTEGRATION: 'Integration',
  SYSTEM: 'System',
  SYSTEM_INTEGRATION: 'System integration',
  ACCEPTANCE: 'Acceptance',
};

export const TEST_TYPE_LABELS: Record<ApiTestType, string> = {
  FUNCTIONAL: 'Functional',
  REGRESSION: 'Regression',
  SMOKE: 'Smoke',
  SANITY: 'Sanity',
  API: 'API',
  PERFORMANCE: 'Performance',
  SECURITY: 'Security',
  USABILITY: 'Usability',
  COMPATIBILITY: 'Compatibility',
  ACCESSIBILITY: 'Accessibility',
  DATA_MIGRATION: 'Data migration',
  UAT: 'UAT',
};
