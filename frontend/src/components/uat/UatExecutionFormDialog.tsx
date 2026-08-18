import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type { CreateUatExecutionPayload, UatExecution, UatExecutionStatus } from '../../types/uat';
import { ALL_EXECUTION_STATUSES, EXECUTION_STATUS_LABELS } from '../../types/uat';
import type { ApiEnvironment } from '../../types/environment';
import type { ApiDefect } from '../../types/defect';

interface UatExecutionFormValues {
  environmentId: string;
  defectId: string;
  status: UatExecutionStatus;
  actualResult: string;
  notes: string;
  evidence: string;
  executedBy: string;
}

function emptyValues(defaultEnvironmentId: string): UatExecutionFormValues {
  return {
    environmentId: defaultEnvironmentId,
    defectId: '',
    status: 'NOT_RUN',
    actualResult: '',
    notes: '',
    evidence: '',
    executedBy: '',
  };
}

export function executionToFormValues(execution: UatExecution): UatExecutionFormValues {
  return {
    environmentId: execution.environmentId,
    defectId: execution.defectId ?? '',
    status: execution.status,
    actualResult: execution.actualResult ?? '',
    notes: execution.notes ?? '',
    evidence: execution.evidence ?? '',
    executedBy: execution.executedBy,
  };
}

interface UatExecutionFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  environments: ApiEnvironment[];
  defects: ApiDefect[];
  initialValues?: UatExecutionFormValues;
  onClose: () => void;
  onSubmit: (data: CreateUatExecutionPayload) => Promise<void>;
}

export function UatExecutionFormDialog({
  open,
  mode,
  environments,
  defects,
  initialValues,
  onClose,
  onSubmit,
}: UatExecutionFormDialogProps) {
  const [values, setValues] = useState<UatExecutionFormValues>(emptyValues(''));
  const [executedByError, setExecutedByError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(environments[0]?.id ?? ''));
      setExecutedByError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, environments]);

  const noEnvironmentsAvailable = mode === 'create' && environments.length === 0;

  // A defect link only makes sense once something has actually gone wrong.
  const defectRelevant = values.status === 'FAIL' || values.status === 'BLOCKED';

  const defectOptions = useMemo(() => defects, [defects]);

  const handleSubmit = async () => {
    const trimmedExecutedBy = values.executedBy.trim();
    if (!trimmedExecutedBy) {
      setExecutedByError('Executed by is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        environmentId: values.environmentId,
        defectId: defectRelevant && values.defectId ? values.defectId : undefined,
        status: values.status,
        actualResult: values.actualResult.trim() || undefined,
        notes: values.notes.trim() || undefined,
        evidence: values.evidence.trim() || undefined,
        executedBy: trimmedExecutedBy,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save UAT execution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Record UAT Execution' : 'Edit UAT Execution'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noEnvironmentsAvailable ? (
            <Alert severity="warning">
              No environments exist for this product yet. Create one before recording an execution.
            </Alert>
          ) : (
            <>
              <TextField
                select
                label="Environment"
                required
                fullWidth
                value={values.environmentId}
                onChange={(e) => setValues((prev) => ({ ...prev, environmentId: e.target.value }))}
              >
                {environments.map((environment) => (
                  <MenuItem key={environment.id} value={environment.id}>
                    {environment.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Status"
                fullWidth
                value={values.status}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, status: e.target.value as UatExecutionStatus }))
                }
              >
                {ALL_EXECUTION_STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {EXECUTION_STATUS_LABELS[status]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Actual Result (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.actualResult}
                onChange={(e) => setValues((prev) => ({ ...prev, actualResult: e.target.value }))}
              />

              {defectRelevant && (
                <TextField
                  select
                  label="Linked Defect (optional)"
                  fullWidth
                  value={values.defectId}
                  helperText={
                    defectOptions.length === 0 ? 'No defects exist for this product yet.' : ' '
                  }
                  onChange={(e) => setValues((prev) => ({ ...prev, defectId: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {defectOptions.map((defect) => (
                    <MenuItem key={defect.id} value={defect.id}>
                      {defect.title}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                label="Evidence (optional)"
                fullWidth
                multiline
                minRows={2}
                placeholder="A URL to a screenshot/recording, or a text description of the evidence"
                value={values.evidence}
                onChange={(e) => setValues((prev) => ({ ...prev, evidence: e.target.value }))}
              />

              <TextField
                label="Comments / Notes (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.notes}
                onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
              />

              <TextField
                label="Executed By"
                required
                fullWidth
                placeholder="e.g. Jordan Lee"
                value={values.executedBy}
                error={Boolean(executedByError)}
                helperText={executedByError ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, executedBy: e.target.value }));
                  if (executedByError) setExecutedByError(null);
                }}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || noEnvironmentsAvailable}
        >
          {mode === 'create' ? 'Record Execution' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export type { UatExecutionFormValues };
