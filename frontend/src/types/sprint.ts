import type { ApiReleaseRef } from './release';

export type SprintStatus = 'Planned' | 'Active' | 'Completed';
export type ApiSprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export const SPRINT_STATUS_LABELS: Record<ApiSprintStatus, SprintStatus> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
};

export interface ApiSprint {
  id: string;
  releaseId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: ApiSprintStatus;
  createdAt: string;
  release: ApiReleaseRef;
}

export interface CreateSprintPayload {
  releaseId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: ApiSprintStatus;
}
