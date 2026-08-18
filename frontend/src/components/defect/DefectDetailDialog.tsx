import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { fetchDefect } from '../../api/defects';
import { ApiError } from '../../api/client';
import type {
  ApiDefect,
  DefectPriority,
  DefectSeverity,
  DefectStatus,
} from '../../types/defect';

const SEVERITY_LABELS: Record<string, DefectSeverity> = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
  TRIVIAL: 'Trivial',
};

const PRIORITY_LABELS: Record<string, DefectPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<string, DefectStatus> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
};

interface DefectDetailDialogProps {
  defectId: string | null;
  onClose: () => void;
}

export function DefectDetailDialog({ defectId, onClose }: DefectDetailDialogProps) {
  const [defect, setDefect] = useState<ApiDefect | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!defectId) {
      setDefect(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setDefect(null);
    setError(null);

    fetchDefect(defectId)
      .then((data) => {
        if (!cancelled) setDefect(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load defect (HTTP ${err.status}).`
            : 'Failed to load defect. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [defectId]);

  return (
    <Dialog open={Boolean(defectId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Defect Details</DialogTitle>
      <DialogContent>
        {!defect && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {defect && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{defect.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {defect.product.name}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={SEVERITY_LABELS[defect.severity]} />
              <StatusChip status={PRIORITY_LABELS[defect.priority]} />
              <StatusChip status={STATUS_LABELS[defect.status]} />
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {defect.description}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Environment
                </Typography>
                <Typography variant="body2">{defect.environment?.name ?? '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Test Case
                </Typography>
                <Typography variant="body2">{defect.testCase?.title ?? '—'}</Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Test Execution
              </Typography>
              <Typography variant="body2">
                {defect.testExecution
                  ? `${defect.testExecution.status} · ${new Date(
                      defect.testExecution.executedAt,
                    ).toLocaleString()}`
                  : '—'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Steps to Reproduce
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {defect.stepsToReproduce}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Expected Result
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {defect.expectedResult}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Actual Result
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {defect.actualResult}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Assigned To
              </Typography>
              <Typography variant="body2">{defect.assignedTo ?? '—'}</Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">{new Date(defect.createdAt).toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">{new Date(defect.updatedAt).toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
