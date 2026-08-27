import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { StatusChip } from '../common/StatusChip';
import { ProductDetailDialog } from '../product/ProductDetailDialog';
import { fetchTestScenario } from '../../api/testScenarios';
import { ApiError } from '../../api/client';
import type {
  ApiTestScenario,
  TestScenarioPriority,
  TestScenarioStatus,
  TestScenarioType,
} from '../../types/testScenario';

const TYPE_LABELS: Record<string, TestScenarioType> = {
  FUNCTIONAL: 'Functional',
  REGRESSION: 'Regression',
  INTEGRATION: 'Integration',
  SMOKE: 'Smoke',
  EDGE_CASE: 'Edge Case',
};

const PRIORITY_LABELS: Record<string, TestScenarioPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<string, TestScenarioStatus> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
};

interface TestScenarioDetailDialogProps {
  testScenarioId: string | null;
  onClose: () => void;
}

export function TestScenarioDetailDialog({
  testScenarioId,
  onClose,
}: TestScenarioDetailDialogProps) {
  const [scenario, setScenario] = useState<ApiTestScenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!testScenarioId) {
      setScenario(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setScenario(null);
    setError(null);

    fetchTestScenario(testScenarioId)
      .then((data) => {
        if (!cancelled) setScenario(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test scenario (HTTP ${err.status}).`
            : 'Failed to load test scenario. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [testScenarioId]);

  return (
    <Dialog open={Boolean(testScenarioId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Test Scenario Details</DialogTitle>
      <DialogContent>
        {!scenario && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {scenario && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{scenario.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                  onClick={() => setViewingProductId(scenario.productId)}
                >
                  {scenario.product.name}
                </Link>
                {scenario.requirement ? ` · Covers: ${scenario.requirement.title}` : ''}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={PRIORITY_LABELS[scenario.priority]} />
              <StatusChip status={STATUS_LABELS[scenario.status]} />
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Type
              </Typography>
              <Typography variant="body2">{TYPE_LABELS[scenario.type]}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {scenario.description}
              </Typography>
            </Box>

            {scenario.release && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Release
                </Typography>
                <Typography variant="body2">
                  {scenario.release.name} ({scenario.release.version})
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(scenario.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(scenario.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>

      <ProductDetailDialog productId={viewingProductId} onClose={() => setViewingProductId(null)} />
    </Dialog>
  );
}
