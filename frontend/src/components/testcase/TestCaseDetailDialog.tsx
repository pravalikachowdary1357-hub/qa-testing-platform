import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { fetchTestCase } from '../../api/testCases';
import { ApiError } from '../../api/client';
import type { ApiTestCase, TestCasePriority, TestCaseStatus } from '../../types/testCase';

const PRIORITY_LABELS: Record<string, TestCasePriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<string, TestCaseStatus> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  APPROVED: 'Approved',
  DEPRECATED: 'Deprecated',
};

interface TestCaseDetailDialogProps {
  testCaseId: string | null;
  onClose: () => void;
}

export function TestCaseDetailDialog({ testCaseId, onClose }: TestCaseDetailDialogProps) {
  const [testCase, setTestCase] = useState<ApiTestCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testCaseId) {
      setTestCase(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setTestCase(null);
    setError(null);

    fetchTestCase(testCaseId)
      .then((data) => {
        if (!cancelled) setTestCase(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test case (HTTP ${err.status}).`
            : 'Failed to load test case. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [testCaseId]);

  return (
    <Dialog open={Boolean(testCaseId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Test Case Details</DialogTitle>
      <DialogContent>
        {!testCase && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {testCase && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{testCase.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                Scenario: {testCase.testScenario.title}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={PRIORITY_LABELS[testCase.priority]} />
              <StatusChip status={STATUS_LABELS[testCase.status]} />
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {testCase.description}
              </Typography>
            </Box>

            {testCase.preconditions && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Preconditions
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {testCase.preconditions}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Steps
              </Typography>
              <TableContainer variant="outlined" component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 48 }}>#</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Expected Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testCase.steps.map((step) => (
                      <TableRow key={step.id}>
                        <TableCell>{step.stepNumber}</TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{step.action}</TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-wrap' }}>
                          {step.expectedResult}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Expected Result (overall)
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {testCase.expectedResult}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(testCase.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(testCase.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
