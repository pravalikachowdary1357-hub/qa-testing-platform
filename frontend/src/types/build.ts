import type { ApiReleaseRef } from './release';

export type BuildStatus = 'Pending' | 'Passed' | 'Failed';
export type ApiBuildStatus = 'PENDING' | 'PASSED' | 'FAILED';

export const BUILD_STATUS_LABELS: Record<ApiBuildStatus, BuildStatus> = {
  PENDING: 'Pending',
  PASSED: 'Passed',
  FAILED: 'Failed',
};

export interface ApiBuild {
  id: string;
  releaseId: string;
  buildNumber: string;
  status: ApiBuildStatus;
  buildDate: string | null;
  notes: string | null;
  createdAt: string;
  release: ApiReleaseRef;
}

export interface CreateBuildPayload {
  releaseId: string;
  buildNumber: string;
  status?: ApiBuildStatus;
  buildDate?: string;
  notes?: string;
}
