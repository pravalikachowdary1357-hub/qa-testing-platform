import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { fetchTestPlan } from '../../api/testPlans';
import { ApiError } from '../../api/client';
import type { ApiTestPlan, TestPlanPriority, TestPlanStatus } from '../../types/testPlan';

const STATUS_LABELS: Record<string, TestPlanStatus> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const PRIORITY_LABELS: Record<string, TestPlanPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

interface TestPlanDetailDialogProps {
  testPlanId: string | null;
  onClose: () => void;
}

export function TestPlanDetailDialog({ testPlanId, onClose }: TestPlanDetailDialogProps) {
  const [testPlan, setTestPlan] = useState<ApiTestPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testPlanId) {
      setTestPlan(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setTestPlan(null);
    setError(null);

    fetchTestPlan(testPlanId)
      .then((data) => {
        if (!cancelled) setTestPlan(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test plan (HTTP ${err.status}).`
            : 'Failed to load test plan. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [testPlanId]);

  return (
    <Dialog open={Boolean(testPlanId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Test Plan Details</DialogTitle>
      <DialogContent>
        {!testPlan && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {testPlan && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{testPlan.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {testPlan.product.name} &middot; Owner: {testPlan.owner}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={PRIORITY_LABELS[testPlan.priority]} />
              <StatusChip status={STATUS_LABELS[testPlan.status]} />
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {testPlan.description}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Start Date
                </Typography>
                <Typography variant="body2">
                  {testPlan.startDate ? new Date(testPlan.startDate).toLocaleDateString() : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  End Date
                </Typography>
                <Typography variant="body2">
                  {testPlan.endDate ? new Date(testPlan.endDate).toLocaleDateString() : '—'}
                </Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                Requirements Covered
              </Typography>
              {testPlan.requirements.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No requirements linked to this test plan.
                </Typography>
              ) : (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {testPlan.requirements.map((requirement) => (
                    <Chip key={requirement.id} size="small" label={requirement.title} />
                  ))}
                </Stack>
              )}
            </Box>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(testPlan.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(testPlan.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
