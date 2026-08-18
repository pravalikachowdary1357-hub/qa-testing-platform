import { useEffect, useState } from 'react';
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
  Typography,
} from '@mui/material';
import type { ApiAutomationListItem, CreateAutomationRunPayload } from '../../types/automation';

type RecordableRunStatus = 'PASS' | 'FAIL' | 'BLOCKED';

const STATUS_OPTIONS: { value: RecordableRunStatus; label: string }[] = [
  { value: 'PASS', label: 'Pass' },
  { value: 'FAIL', label: 'Fail' },
  { value: 'BLOCKED', label: 'Blocked' },
];

// Formats a Date as the value a `type="datetime-local"` input expects
// (local time, no timezone/seconds), e.g. "2026-08-16T14:30".
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

interface RecordRunFormValues {
  status: RecordableRunStatus;
  startedAt: string;
  finishedAt: string;
  notes: string;
  recordedBy: string;
}

function emptyValues(): RecordRunFormValues {
  return {
    status: 'PASS',
    startedAt: toDatetimeLocalValue(new Date()),
    finishedAt: '',
    notes: '',
    recordedBy: '',
  };
}

interface RecordAutomationRunDialogProps {
  automation: ApiAutomationListItem | null;
  onClose: () => void;
  onSubmit: (data: CreateAutomationRunPayload) => Promise<void>;
}

export function RecordAutomationRunDialog({
  automation,
  onClose,
  onSubmit,
}: RecordAutomationRunDialogProps) {
  const [values, setValues] = useState<RecordRunFormValues>(emptyValues());
  const [startedAtError, setStartedAtError] = useState<string | null>(null);
  const [recordedByError, setRecordedByError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (automation) {
      setValues(emptyValues());
      setStartedAtError(null);
      setRecordedByError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [automation]);

  const handleSubmit = async () => {
    const trimmedRecordedBy = values.recordedBy.trim();
    let hasError = false;

    if (!values.startedAt) {
      setStartedAtError('Started at is required.');
      hasError = true;
    }
    if (!trimmedRecordedBy) {
      setRecordedByError('Recorded by is required.');
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        status: values.status,
        startedAt: new Date(values.startedAt).toISOString(),
        finishedAt: values.finishedAt ? new Date(values.finishedAt).toISOString() : undefined,
        notes: values.notes.trim() || undefined,
        recordedBy: trimmedRecordedBy,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to record run result.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(automation)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Record Run Result</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Record the outcome of a run of <strong>{automation?.name}</strong> that was executed
            elsewhere. This does not run anything -- it only saves a manual record.
          </Typography>

          <TextField
            select
            label="Status"
            required
            fullWidth
            value={values.status}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, status: e.target.value as RecordableRunStatus }))
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Started At"
              type="datetime-local"
              required
              fullWidth
              value={values.startedAt}
              error={Boolean(startedAtError)}
              helperText={startedAtError ?? ' '}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, startedAt: e.target.value }));
                if (startedAtError) setStartedAtError(null);
              }}
            />
            <TextField
              label="Finished At (optional)"
              type="datetime-local"
              fullWidth
              value={values.finishedAt}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(e) => setValues((prev) => ({ ...prev, finishedAt: e.target.value }))}
            />
          </Stack>

          <TextField
            label="Notes (optional)"
            fullWidth
            multiline
            minRows={2}
            value={values.notes}
            onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
          />

          <TextField
            label="Recorded By"
            required
            fullWidth
            placeholder="e.g. Jordan Lee"
            value={values.recordedBy}
            error={Boolean(recordedByError)}
            helperText={recordedByError ?? ' '}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, recordedBy: e.target.value }));
              if (recordedByError) setRecordedByError(null);
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          Record Run Result
        </Button>
      </DialogActions>
    </Dialog>
  );
}
