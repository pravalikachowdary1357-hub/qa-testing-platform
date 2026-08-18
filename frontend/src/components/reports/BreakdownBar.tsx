import { Box, Stack, Typography, useTheme } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { getStatusTone } from '../common/StatusChip';
import type { StatusTone } from '../common/StatusChip';

export function toneToColor(tone: StatusTone, theme: Theme): string {
  switch (tone) {
    case 'success':
      return theme.palette.success.main;
    case 'warning':
      return theme.palette.warning.main;
    case 'error':
      return theme.palette.error.main;
    default:
      return theme.palette.grey[500];
  }
}

// Resolves a segment's color from the exact same status-tone map StatusChip
// uses, so a "Pass" bar segment and a "Pass" chip are always the same green.
export function colorForStatusLabel(label: string, theme: Theme): string {
  return toneToColor(getStatusTone(label), theme);
}

export interface BreakdownSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface BreakdownBarProps {
  segments: BreakdownSegment[];
  emptyLabel?: string;
}

// The one reusable chart used across every report tab: a labeled horizontal
// stacked bar (part-to-whole) with a legend showing count + percentage for
// every segment, so identity is never color-alone.
export function BreakdownBar({ segments, emptyLabel = 'No data yet.' }: BreakdownBarProps) {
  const theme = useTheme();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const visible = segments.filter((segment) => segment.value > 0);

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: 12,
          borderRadius: 6,
          overflow: 'hidden',
          bgcolor: theme.palette.action.hover,
        }}
      >
        {visible.map((segment, index) => (
          <Box
            key={segment.key}
            title={`${segment.label}: ${segment.value} (${Math.round((segment.value / total) * 100)}%)`}
            sx={{
              width: `${(segment.value / total) * 100}%`,
              bgcolor: segment.color,
              marginRight: index < visible.length - 1 ? '2px' : 0,
            }}
          />
        ))}
      </Box>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
        {segments.map((segment) => (
          <Stack key={segment.key} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: segment.color, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">
              {segment.label}: {segment.value} ({total > 0 ? Math.round((segment.value / total) * 100) : 0}%)
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
