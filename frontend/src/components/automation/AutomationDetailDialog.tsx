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
import { fetchAutomation } from '../../api/automation';
import { ApiError } from '../../api/client';
import type {
  ApiAutomation,
  ApiAutomationFramework,
  ApiAutomationRunStatus,
  ApiAutomationType,
  AutomationFramework,
  AutomationRunStatus,
  AutomationType,
} from '../../types/automation';

const TYPE_LABELS: Record<ApiAutomationType, AutomationType> = {
  UI: 'UI',
  API: 'API',
  UNIT: 'Unit',
  INTEGRATION: 'Integration',
  PERFORMANCE: 'Performance',
};

const FRAMEWORK_LABELS: Record<ApiAutomationFramework, AutomationFramework> = {
  PLAYWRIGHT: 'Playwright',
  SELENIUM: 'Selenium',
  CYPRESS: 'Cypress',
  JEST: 'Jest',
  POSTMAN: 'Postman',
  OTHER: 'Other',
};

const RUN_STATUS_LABELS: Record<ApiAutomationRunStatus, AutomationRunStatus> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
  NOT_RUN: 'Not Run',
};

interface AutomationDetailDialogProps {
  automationId: string | null;
  onClose: () => void;
}

export function AutomationDetailDialog({ automationId, onClose }: AutomationDetailDialogProps) {
  const [automation, setAutomation] = useState<ApiAutomation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!automationId) {
      setAutomation(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setAutomation(null);
    setError(null);

    fetchAutomation(automationId)
      .then((data) => {
        if (!cancelled) setAutomation(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load automation (HTTP ${err.status}).`
            : 'Failed to load automation. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [automationId]);

  return (
    <Dialog open={Boolean(automationId)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Automation Details</DialogTitle>
      <DialogContent>
        {!automation && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {automation && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{automation.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {automation.testCase.title}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <StatusChip status={TYPE_LABELS[automation.type]} />
              <StatusChip status={FRAMEWORK_LABELS[automation.framework]} />
              <StatusChip status={automation.enabled ? 'Enabled' : 'Disabled'} />
              <StatusChip status={RUN_STATUS_LABELS[automation.lastRunStatus]} />
            </Stack>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Test Case
                </Typography>
                <Typography variant="body2">{automation.testCase.title}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Environment
                </Typography>
                <Typography variant="body2">{automation.environment?.name ?? '—'}</Typography>
              </Box>
            </Stack>

            {automation.description && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {automation.description}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Schedule
              </Typography>
              <Typography variant="body2">{automation.schedule ?? '—'}</Typography>
            </Box>

            {automation.lastRunNotes && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Run Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {automation.lastRunNotes}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(automation.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(automation.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Run History
              </Typography>

              {automation.runs.length === 0 ? (
                <Alert severity="info">
                  No runs recorded yet. If the current backend does not have an execution engine,
                  record results manually after running this automation elsewhere.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Started</TableCell>
                        <TableCell>Finished</TableCell>
                        <TableCell>Recorded By</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {automation.runs.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>
                            <StatusChip status={RUN_STATUS_LABELS[run.status]} />
                          </TableCell>
                          <TableCell>{new Date(run.startedAt).toLocaleString()}</TableCell>
                          <TableCell>
                            {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell>{run.recordedBy}</TableCell>
                          <TableCell sx={{ maxWidth: 160 }}>
                            <Typography variant="body2" noWrap title={run.notes ?? undefined}>
                              {run.notes ?? '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
