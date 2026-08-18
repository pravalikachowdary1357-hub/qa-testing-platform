import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { StatusChip } from '../common/StatusChip';
import {
  UatExecutionFormDialog,
  executionToFormValues,
} from './UatExecutionFormDialog';
import type { UatExecutionFormValues } from './UatExecutionFormDialog';
import { DeleteUatExecutionDialog } from './DeleteUatExecutionDialog';
import {
  addUatExecution,
  deleteUatExecution,
  updateUatExecution,
} from '../../api/uat';
import { EXECUTION_STATUS_LABELS } from '../../types/uat';
import type { CreateUatExecutionPayload, UatExecution, UatTestCase } from '../../types/uat';
import type { ApiEnvironment } from '../../types/environment';
import type { ApiDefect } from '../../types/defect';

interface UatTestCaseDetailDialogProps {
  cycleId: string;
  testCase: UatTestCase | null;
  environments: ApiEnvironment[];
  defects: ApiDefect[];
  onClose: () => void;
  onMutate: () => void;
}

export function UatTestCaseDetailDialog({
  cycleId,
  testCase,
  environments,
  defects,
  onClose,
  onMutate,
}: UatTestCaseDetailDialogProps) {
  const [executionFormMode, setExecutionFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingExecution, setEditingExecution] = useState<UatExecution | null>(null);
  const [deletingExecution, setDeletingExecution] = useState<UatExecution | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!testCase) return null;

  const handleAddExecution = async (data: CreateUatExecutionPayload) => {
    try {
      await addUatExecution(cycleId, testCase.id, data);
      onMutate();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to record execution.');
      throw err;
    }
  };

  const handleEditExecution = async (data: CreateUatExecutionPayload) => {
    if (!editingExecution) return;
    await updateUatExecution(cycleId, testCase.id, editingExecution.id, data);
    onMutate();
  };

  const handleDeleteExecution = async () => {
    if (!deletingExecution) return;
    await deleteUatExecution(cycleId, testCase.id, deletingExecution.id);
    onMutate();
  };

  return (
    <Dialog open={Boolean(testCase)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>UAT Test Case Details</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="h6">{testCase.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              Assigned to {testCase.assignedTester}
              {testCase.requirement ? ` · Covers "${testCase.requirement.title}"` : ''}
            </Typography>
            {testCase.description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {testCase.description}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Steps
            </Typography>
            {testCase.steps.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No steps recorded.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {testCase.steps.map((step) => (
                  <Box key={step.id}>
                    <Typography variant="body2">
                      <strong>{step.stepNumber}.</strong> {step.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 2.5 }}>
                      Expected: {step.expectedResult}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Overall Expected Result
            </Typography>
            <Typography variant="body2">{testCase.expectedResult}</Typography>
          </Box>

          {actionError && <Alert severity="error">{actionError}</Alert>}

          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Execution History ({testCase.executions.length})</Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  setActionError(null);
                  setExecutionFormMode('create');
                }}
              >
                Record Execution
              </Button>
            </Stack>

            {testCase.executions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No executions recorded yet.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Environment</TableCell>
                      <TableCell>Executed By</TableCell>
                      <TableCell>Executed At</TableCell>
                      <TableCell>Defect</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {testCase.executions.map((execution) => (
                      <TableRow key={execution.id} hover>
                        <TableCell>
                          <StatusChip status={EXECUTION_STATUS_LABELS[execution.status]} />
                        </TableCell>
                        <TableCell>{execution.environment.name}</TableCell>
                        <TableCell>{execution.executedBy}</TableCell>
                        <TableCell>{new Date(execution.executedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          {execution.defect ? (
                            <Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>
                              {execution.defect.title}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditingExecution(execution);
                                setExecutionFormMode('edit');
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeletingExecution(execution)}>
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
      </DialogContent>

      <UatExecutionFormDialog
        open={executionFormMode !== null}
        mode={executionFormMode ?? 'create'}
        environments={environments}
        defects={defects}
        initialValues={
          executionFormMode === 'edit' && editingExecution
            ? (executionToFormValues(editingExecution) as UatExecutionFormValues)
            : undefined
        }
        onClose={() => {
          setExecutionFormMode(null);
          setEditingExecution(null);
        }}
        onSubmit={executionFormMode === 'edit' ? handleEditExecution : handleAddExecution}
      />

      <DeleteUatExecutionDialog
        execution={deletingExecution}
        onClose={() => setDeletingExecution(null)}
        onConfirm={handleDeleteExecution}
      />
    </Dialog>
  );
}
