import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { StatusChip } from '../common/StatusChip';
import {
  SecurityFindingFormDialog,
  findingToFormValues,
} from './SecurityFindingFormDialog';
import type { SecurityFindingFormValues } from './SecurityFindingFormDialog';
import { DeleteSecurityFindingDialog } from './DeleteSecurityFindingDialog';
import {
  addSecurityFinding,
  completeSecurityTest,
  deleteSecurityFinding,
  executeSecurityTest,
  fetchSecurityTest,
  updateSecurityFinding,
} from '../../api/securityTesting';
import { ApiError } from '../../api/client';
import {
  TEST_STATUS_LABELS,
  TEST_TYPE_LABELS,
  VULN_STATUS_LABELS,
} from '../../types/securityTesting';
import type { CreateSecurityFindingPayload, SecurityFinding, SecurityTest } from '../../types/securityTesting';

interface SecurityTestDetailDialogProps {
  securityTestId: string | null;
  onClose: () => void;
  onMutate?: () => void;
}

export function SecurityTestDetailDialog({
  securityTestId,
  onClose,
  onMutate,
}: SecurityTestDetailDialogProps) {
  const [test, setTest] = useState<SecurityTest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [executing, setExecuting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completeStatus, setCompleteStatus] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [completeNotes, setCompleteNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const [findingFormMode, setFindingFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingFinding, setEditingFinding] = useState<SecurityFinding | null>(null);
  const [deletingFinding, setDeletingFinding] = useState<SecurityFinding | null>(null);

  useEffect(() => {
    if (!securityTestId) {
      setTest(null);
      setError(null);
      setExecuting(false);
      setActionError(null);
      setCompleteNotes('');
      setCompleteStatus('PASSED');
      return;
    }

    let cancelled = false;
    setTest(null);
    setError(null);
    setActionError(null);
    setCompleteNotes('');
    setCompleteStatus('PASSED');

    fetchSecurityTest(securityTestId)
      .then((data) => {
        if (!cancelled) setTest(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load security test (HTTP ${err.status}).`
            : 'Failed to load security test. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [securityTestId]);

  const refresh = async () => {
    if (!securityTestId) return;
    const refreshed = await fetchSecurityTest(securityTestId);
    setTest(refreshed);
    onMutate?.();
  };

  const handleExecute = async () => {
    if (!securityTestId) return;
    setActionError(null);
    setExecuting(true);
    try {
      await executeSecurityTest(securityTestId);
      await refresh();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError
          ? `Failed to start execution (HTTP ${err.status}): ${err.message}`
          : 'Failed to start execution. Is the backend running?',
      );
    } finally {
      setExecuting(false);
    }
  };

  const handleComplete = async () => {
    if (!securityTestId) return;
    setActionError(null);
    setCompleting(true);
    try {
      await completeSecurityTest(securityTestId, {
        status: completeStatus,
        notes: completeNotes.trim() || undefined,
      });
      setCompleteNotes('');
      await refresh();
    } catch (err: unknown) {
      setActionError(
        err instanceof ApiError
          ? `Failed to complete test (HTTP ${err.status}): ${err.message}`
          : 'Failed to complete test. Is the backend running?',
      );
    } finally {
      setCompleting(false);
    }
  };

  const handleAddFinding = async (data: CreateSecurityFindingPayload) => {
    if (!securityTestId) return;
    await addSecurityFinding(securityTestId, data);
    await refresh();
  };

  const handleEditFinding = async (data: CreateSecurityFindingPayload) => {
    if (!securityTestId || !editingFinding) return;
    await updateSecurityFinding(securityTestId, editingFinding.id, data);
    await refresh();
  };

  const handleDeleteFinding = async () => {
    if (!securityTestId || !deletingFinding) return;
    await deleteSecurityFinding(securityTestId, deletingFinding.id);
    await refresh();
  };

  return (
    <Dialog open={Boolean(securityTestId)} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Security Test Details</DialogTitle>
      <DialogContent>
        {!test && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {test && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h6">{test.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {test.product.name}
                {test.environment ? ` · ${test.environment.name}` : ''}
                {test.testCase ? ` · ${test.testCase.title}` : ''}
              </Typography>
              {test.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {test.description}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Target
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {test.target}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Test Type
                </Typography>
                <Typography variant="body2">{TEST_TYPE_LABELS[test.testType]}</Typography>
              </Box>
            </Stack>

            {test.configuration && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Configuration
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {test.configuration}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
              <StatusChip status={TEST_STATUS_LABELS[test.status]} />
              {test.lastExecutedAt && (
                <Typography variant="body2" color="text.secondary">
                  Last executed {new Date(test.lastExecutedAt).toLocaleString()}
                </Typography>
              )}
            </Stack>
            {test.lastRunNotes && (
              <Alert severity="info" sx={{ mt: -1 }}>
                {test.lastRunNotes}
              </Alert>
            )}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={executing ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleExecute}
                disabled={executing || test.status === 'RUNNING'}
              >
                {executing ? 'Starting…' : 'Execute'}
              </Button>
            </Stack>

            {test.status === 'RUNNING' && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Record Result
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This app does not run automated security scans or attacks -- record the real
                  outcome once manual testing or an external scanning tool has finished.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    select
                    label="Outcome"
                    value={completeStatus}
                    onChange={(e) => setCompleteStatus(e.target.value as 'PASSED' | 'FAILED')}
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="PASSED">Passed</MenuItem>
                    <MenuItem value="FAILED">Failed</MenuItem>
                  </TextField>
                  <TextField
                    label="Notes (optional)"
                    fullWidth
                    value={completeNotes}
                    onChange={(e) => setCompleteNotes(e.target.value)}
                  />
                </Stack>
                <Button
                  variant="contained"
                  startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                  onClick={handleComplete}
                  disabled={completing}
                >
                  {completing ? 'Recording…' : 'Complete Test'}
                </Button>
              </Paper>
            )}

            {actionError && <Alert severity="error">{actionError}</Alert>}

            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Findings ({test.findings.length})</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setFindingFormMode('create')}
                >
                  Add Finding
                </Button>
              </Stack>

              {test.findings.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No findings recorded yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Discovered</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {test.findings.map((finding) => (
                        <TableRow key={finding.id} hover>
                          <TableCell sx={{ maxWidth: 260 }}>
                            <Typography variant="body2" noWrap>
                              {finding.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={finding.severity}
                              size="small"
                              color={
                                finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                                  ? 'error'
                                  : finding.severity === 'MEDIUM'
                                    ? 'warning'
                                    : 'default'
                              }
                              variant={finding.severity === 'LOW' || finding.severity === 'INFO' ? 'outlined' : 'filled'}
                            />
                          </TableCell>
                          <TableCell>
                            <StatusChip status={VULN_STATUS_LABELS[finding.status]} />
                          </TableCell>
                          <TableCell>{new Date(finding.discoveredAt).toLocaleDateString()}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingFinding(finding);
                                  setFindingFormMode('edit');
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => setDeletingFinding(finding)}>
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

      <SecurityFindingFormDialog
        open={findingFormMode !== null}
        mode={findingFormMode ?? 'create'}
        initialValues={
          findingFormMode === 'edit' && editingFinding
            ? (findingToFormValues(editingFinding) as SecurityFindingFormValues)
            : undefined
        }
        onClose={() => {
          setFindingFormMode(null);
          setEditingFinding(null);
        }}
        onSubmit={findingFormMode === 'edit' ? handleEditFinding : handleAddFinding}
      />

      <DeleteSecurityFindingDialog
        finding={deletingFinding}
        onClose={() => setDeletingFinding(null)}
        onConfirm={handleDeleteFinding}
      />
    </Dialog>
  );
}
