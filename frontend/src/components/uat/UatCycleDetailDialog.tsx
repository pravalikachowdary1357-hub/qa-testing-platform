import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { StatusChip } from '../common/StatusChip';
import {
  UatTestCaseFormDialog,
  uatTestCaseToFormValues,
} from './UatTestCaseFormDialog';
import type { UatTestCaseFormValues } from './UatTestCaseFormDialog';
import { DeleteUatTestCaseDialog } from './DeleteUatTestCaseDialog';
import { UatTestCaseDetailDialog } from './UatTestCaseDetailDialog';
import {
  addUatTestCase,
  deleteUatTestCase,
  fetchUatCycle,
  updateUatTestCase,
} from '../../api/uat';
import { ApiError } from '../../api/client';
import { CYCLE_STATUS_LABELS, EXECUTION_STATUS_LABELS } from '../../types/uat';
import type { CreateUatTestCasePayload, UatCycle, UatTestCase } from '../../types/uat';
import type { ApiEnvironment } from '../../types/environment';
import type { ApiDefect } from '../../types/defect';
import type { ApiRequirement } from '../../types/requirement';

interface UatCycleDetailDialogProps {
  cycleId: string | null;
  environments: ApiEnvironment[];
  defects: ApiDefect[];
  requirements: ApiRequirement[];
  onClose: () => void;
  onMutate: () => void;
}

function latestStatusLabel(testCase: UatTestCase): string {
  const latest = testCase.executions[0];
  return EXECUTION_STATUS_LABELS[latest?.status ?? 'NOT_RUN'];
}

export function UatCycleDetailDialog({
  cycleId,
  environments,
  defects,
  requirements,
  onClose,
  onMutate,
}: UatCycleDetailDialogProps) {
  const [cycle, setCycle] = useState<UatCycle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [testCaseFormMode, setTestCaseFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingTestCase, setEditingTestCase] = useState<UatTestCase | null>(null);
  const [deletingTestCase, setDeletingTestCase] = useState<UatTestCase | null>(null);
  const [viewingTestCase, setViewingTestCase] = useState<UatTestCase | null>(null);

  useEffect(() => {
    if (!cycleId) {
      setCycle(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setCycle(null);
    setError(null);

    fetchUatCycle(cycleId)
      .then((data) => {
        if (!cancelled) setCycle(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load UAT cycle (HTTP ${err.status}).`
            : 'Failed to load UAT cycle. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [cycleId]);

  const refresh = async () => {
    if (!cycleId) return;
    const refreshed = await fetchUatCycle(cycleId);
    setCycle(refreshed);
    // Keep an open test-case detail dialog in sync with the freshly-fetched data.
    setViewingTestCase((prev) => (prev ? (refreshed.testCases.find((tc) => tc.id === prev.id) ?? null) : null));
    onMutate();
  };

  const environmentsForProduct = useMemo(
    () => (cycle ? environments.filter((env) => env.productId === cycle.productId) : []),
    [environments, cycle],
  );
  const defectsForProduct = useMemo(
    () => (cycle ? defects.filter((defect) => defect.productId === cycle.productId) : []),
    [defects, cycle],
  );

  const handleAddTestCase = async (data: CreateUatTestCasePayload) => {
    if (!cycleId) return;
    await addUatTestCase(cycleId, data);
    await refresh();
  };

  const handleEditTestCase = async (data: CreateUatTestCasePayload) => {
    if (!cycleId || !editingTestCase) return;
    await updateUatTestCase(cycleId, editingTestCase.id, data);
    await refresh();
  };

  const handleDeleteTestCase = async () => {
    if (!cycleId || !deletingTestCase) return;
    await deleteUatTestCase(cycleId, deletingTestCase.id);
    await refresh();
  };

  return (
    <Dialog open={Boolean(cycleId)} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>UAT Cycle Details</DialogTitle>
      <DialogContent>
        {!cycle && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {cycle && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{cycle.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {cycle.product.name}
              </Typography>
              {cycle.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {cycle.description}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <StatusChip status={CYCLE_STATUS_LABELS[cycle.status]} />
            </Stack>

            {cycle.signOffBy && (
              <Alert severity={cycle.status === 'REJECTED' ? 'error' : 'success'}>
                Signed off by {cycle.signOffBy}
                {cycle.signOffAt ? ` on ${new Date(cycle.signOffAt).toLocaleString()}` : ''}
                {cycle.signOffNotes ? ` — ${cycle.signOffNotes}` : ''}
              </Alert>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Summary
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                {[
                  { label: 'Pass', value: cycle.summary.pass },
                  { label: 'Fail', value: cycle.summary.fail },
                  { label: 'Blocked', value: cycle.summary.blocked },
                  { label: 'Not Run', value: cycle.summary.notRun },
                  { label: 'Not Applicable', value: cycle.summary.notApplicable },
                ].map((item) => (
                  <Paper key={item.label} variant="outlined" sx={{ p: 1.5, minWidth: 90, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {item.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Test Cases ({cycle.testCases.length})</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setTestCaseFormMode('create')}
                >
                  Add Test Case
                </Button>
              </Stack>

              {cycle.testCases.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No UAT test cases yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Requirement</TableCell>
                        <TableCell>Assigned Tester</TableCell>
                        <TableCell>Latest Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cycle.testCases.map((testCase) => (
                        <TableRow key={testCase.id} hover>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Typography variant="body2" noWrap>
                              {testCase.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {testCase.requirement?.title ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{testCase.assignedTester}</TableCell>
                          <TableCell>
                            <StatusChip status={latestStatusLabel(testCase)} />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => setViewingTestCase(testCase)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingTestCase(testCase);
                                  setTestCaseFormMode('edit');
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => setDeletingTestCase(testCase)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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

      {cycle && (
        <UatTestCaseFormDialog
          open={testCaseFormMode !== null}
          mode={testCaseFormMode ?? 'create'}
          productId={cycle.productId}
          requirements={requirements}
          initialValues={
            testCaseFormMode === 'edit' && editingTestCase
              ? (uatTestCaseToFormValues(editingTestCase) as UatTestCaseFormValues)
              : undefined
          }
          onClose={() => {
            setTestCaseFormMode(null);
            setEditingTestCase(null);
          }}
          onSubmit={testCaseFormMode === 'edit' ? handleEditTestCase : handleAddTestCase}
        />
      )}

      <DeleteUatTestCaseDialog
        testCase={deletingTestCase}
        onClose={() => setDeletingTestCase(null)}
        onConfirm={handleDeleteTestCase}
      />

      {cycleId && (
        <UatTestCaseDetailDialog
          cycleId={cycleId}
          testCase={viewingTestCase}
          environments={environmentsForProduct}
          defects={defectsForProduct}
          onClose={() => setViewingTestCase(null)}
          onMutate={refresh}
        />
      )}
    </Dialog>
  );
}
