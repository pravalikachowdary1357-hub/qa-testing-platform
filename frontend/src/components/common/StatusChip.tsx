import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';

type StatusTone = 'success' | 'warning' | 'error' | 'default';

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
  Draft: 'default',
  Medium: 'default',
  Archived: 'default',
};

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
