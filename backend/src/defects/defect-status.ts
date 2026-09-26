import type { DefectStatus } from '../../generated/prisma/enums.js';

// One place that says what every defect status *means* for reporting and
// release readiness, so the source lifecycle statuses (New, Assigned,
// Fixed, Ready for Retest, Retested, Rejected, Duplicate, Deferred, Cannot
// Reproduce) are counted consistently everywhere.
//
//   open        -- reported, not yet being worked on
//   inProgress  -- being fixed
//   resolved    -- fix delivered, awaiting / passed verification
//   reopened    -- failed verification
//   closed      -- finished (closed, rejected, duplicate, not reproducible)
//   deferred    -- knowingly postponed to a later release
export type DefectStatusGroup =
  'open' | 'inProgress' | 'resolved' | 'reopened' | 'closed' | 'deferred';

export const DEFECT_STATUS_GROUP: Record<DefectStatus, DefectStatusGroup> = {
  NEW: 'open',
  OPEN: 'open',
  ASSIGNED: 'open',
  IN_PROGRESS: 'inProgress',
  FIXED: 'resolved',
  READY_FOR_RETEST: 'resolved',
  RETESTED: 'resolved',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
  CLOSED: 'closed',
  REJECTED: 'closed',
  DUPLICATE: 'closed',
  CANNOT_REPRODUCE: 'closed',
  DEFERRED: 'deferred',
};

export const ALL_DEFECT_STATUSES = Object.keys(
  DEFECT_STATUS_GROUP,
) as DefectStatus[];

// "Open" in the unresolved sense used by every KPI and quality gate:
// still needs development work. Same meaning as before (OPEN,
// IN_PROGRESS, REOPENED), extended with New and Assigned.
export const OPEN_DEFECT_STATUSES: DefectStatus[] = ALL_DEFECT_STATUSES.filter(
  (status) => {
    const group = DEFECT_STATUS_GROUP[status];
    return group === 'open' || group === 'inProgress' || group === 'reopened';
  },
);

const OPEN_SET = new Set<string>(OPEN_DEFECT_STATUSES);

export function isOpenDefectStatus(status: string): boolean {
  return OPEN_SET.has(status);
}

export function emptyDefectStatusCounts() {
  return {
    open: 0,
    inProgress: 0,
    resolved: 0,
    reopened: 0,
    closed: 0,
    deferred: 0,
  };
}

export function countDefectStatus(
  counts: ReturnType<typeof emptyDefectStatusCounts>,
  status: string,
) {
  const group = DEFECT_STATUS_GROUP[status as DefectStatus];
  if (group) counts[group] += 1;
}
