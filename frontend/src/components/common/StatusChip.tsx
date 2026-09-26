import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

export type StatusTone = 'success' | 'warning' | 'error' | 'default';

// Maps known status/readiness labels (ProductStatus, ReleaseReadiness, ...)
// to a chip color so every page renders them consistently.
const STATUS_TONE_MAP: Record<string, StatusTone> = {
  Active: 'success',
  Ready: 'success',
  Verified: 'success',
  Low: 'success',
  Pass: 'success',
  'On Hold': 'warning',
  Conditional: 'warning',
  Inactive: 'warning',
  Approved: 'warning',
  Implemented: 'warning',
  High: 'warning',
  'In Review': 'warning',
  'In Progress': 'warning',
  Maintenance: 'warning',
  Completed: 'success',
  Deprecated: 'error',
  'Not Ready': 'error',
  Rejected: 'error',
  Critical: 'error',
  Blocked: 'error',
  Fail: 'error',
  Failed: 'error',
  Draft: 'default',
  Medium: 'default',
  Archived: 'default',
  Open: 'error',
  New: 'error',
  Assigned: 'warning',
  Fixed: 'success',
  'Ready for Retest': 'warning',
  Retested: 'success',
  Duplicate: 'default',
  Deferred: 'default',
  'Cannot Reproduce': 'default',
  Resolved: 'success',
  Reopened: 'error',
  Closed: 'default',
  Major: 'warning',
  Minor: 'default',
  Trivial: 'success',
  Enabled: 'success',
  Disabled: 'default',
  'Not Run': 'default',
  'No Assertion': 'default',
  Queued: 'default',
  Running: 'warning',
  Passed: 'success',
  Stopped: 'default',
  Info: 'default',
  Accepted: 'warning',
  'Not Started': 'default',
  Planned: 'default',
  'Not Applicable': 'default',
  'Not Covered': 'error',
  'Not Executed': 'warning',
  Executed: 'success',
  'In Testing': 'warning',
  'Conditionally Ready': 'warning',
};

// Exported so other components (e.g. report charts) can color non-chip
// elements -- a bar segment, a legend dot -- with the exact same status
// semantics as this chip, instead of maintaining a second mapping.
export function getStatusTone(status: string): StatusTone {
  return STATUS_TONE_MAP[status] ?? 'default';
}

interface StatusChipProps {
  status: string;
  size?: ChipProps['size'];
}

export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const tone = STATUS_TONE_MAP[status] ?? 'default';

  return (
    <Chip
      label={status}
      color={tone}
      size={size}
      variant={tone === 'default' ? 'outlined' : 'filled'}
    />
  );
}
