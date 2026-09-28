import type { ApiTestLevel, ApiTestType, TestPlanMilestone } from '../../types/testPlan';

export interface GovernanceValues {
  isMaster: boolean;
  scope: string;
  objectives: string;
  testLevels: ApiTestLevel[];
  testTypes: ApiTestType[];
  approach: string;
  entryCriteria: string;
  exitCriteria: string;
  estimatedEffortHours: string;
  resources: string;
  risks: string;
  milestones: TestPlanMilestone[];
}

export const EMPTY_GOVERNANCE: GovernanceValues = {
  isMaster: false,
  scope: '',
  objectives: '',
  testLevels: [],
  testTypes: [],
  approach: '',
  entryCriteria: '',
  exitCriteria: '',
  estimatedEffortHours: '',
  resources: '',
  risks: '',
  milestones: [],
};

// Form values -> API payload (empty strings become "not set").
export function governancePayload(v: GovernanceValues) {
  const text = (s: string) => s.trim();
  return {
    isMaster: v.isMaster,
    scope: text(v.scope),
    objectives: text(v.objectives),
    testLevels: v.testLevels,
    testTypes: v.testTypes,
    approach: text(v.approach),
    entryCriteria: text(v.entryCriteria),
    exitCriteria: text(v.exitCriteria),
    estimatedEffortHours:
      v.estimatedEffortHours.trim() !== ''
        ? Math.max(0, Math.round(Number(v.estimatedEffortHours)))
        : null,
    resources: text(v.resources),
    risks: text(v.risks),
    milestones: v.milestones
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        ...(m.dueDate ? { dueDate: m.dueDate } : {}),
        done: Boolean(m.done),
      })),
  };
}
