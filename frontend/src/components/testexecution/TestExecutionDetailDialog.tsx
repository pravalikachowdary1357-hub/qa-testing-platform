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
import { fetchTestExecution } from '../../api/testExecutions';
import { ApiError } from '../../api/client';
import type { ApiTestExecution, TestExecutionStatus } from '../../types/testExecution';

const STATUS_LABELS: Record<string, TestExecutionStatus> = {
  PENDING: 'Pending',
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
};

interface TestExecutionDetailDialogProps {
  testExecutionId: string | null;
  onClose: () => void;
}

export function TestExecutionDetailDialog({
  testExecutionId,
  onClose,
}: TestExecutionDetailDialogProps) {
  const [execution, setExecution] = useState<ApiTestExecution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testExecutionId) {
      setExecution(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setExecution(null);
    setError(null);

    fetchTestExecution(testExecutionId)
      .then((data) => {
        if (!cancelled) setExecution(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test execution (HTTP ${err.status}).`
            : 'Failed to load test execution. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [testExecutionId]);

  return (
    <Dialog open={Boolean(testExecutionId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Test Execution Details</DialogTitle>
      <DialogContent>
        {!execution && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {execution && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{execution.testCase.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {execution.testCase.testScenario.product.name} ·{' '}
                {execution.testCase.testScenario.title}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={STATUS_LABELS[execution.status]} />
            </Stack>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Environment
                </Typography>
                <Typography variant="body2">{execution.environment.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Test Data
                </Typography>
                <Typography variant="body2">{execution.testData?.name ?? '—'}</Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Expected Result
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {execution.testCase.expectedResult}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Actual Result
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {execution.actualResult ?? '—'}
              </Typography>
            </Box>

            {execution.notes && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {execution.notes}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Executed By
                </Typography>
                <Typography variant="body2">{execution.executedBy}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Executed At
                </Typography>
                <Typography variant="body2">
                  {new Date(execution.executedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(execution.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(execution.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
