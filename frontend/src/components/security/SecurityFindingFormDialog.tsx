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
} from '@mui/material';
import type {
  CreateSecurityFindingPayload,
  FindingSeverity,
  SecurityFinding,
  VulnerabilityStatus,
} from '../../types/securityTesting';
import { ALL_SEVERITIES, ALL_VULN_STATUSES, SEVERITY_LABELS, VULN_STATUS_LABELS } from '../../types/securityTesting';

export interface SecurityFindingFormValues {
  title: string;
  description: string;
  severity: FindingSeverity;
  evidence: string;
  recommendation: string;
  status: VulnerabilityStatus;
}

function emptyValues(): SecurityFindingFormValues {
  return {
    title: '',
    description: '',
    severity: 'MEDIUM',
    evidence: '',
    recommendation: '',
    status: 'OPEN',
  };
}

export function findingToFormValues(finding: SecurityFinding): SecurityFindingFormValues {
  return {
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    evidence: finding.evidence ?? '',
    recommendation: finding.recommendation,
    status: finding.status,
  };
}

interface SecurityFindingFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: SecurityFindingFormValues;
  onClose: () => void;
  onSubmit: (data: CreateSecurityFindingPayload) => Promise<void>;
}

export function SecurityFindingFormDialog({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: SecurityFindingFormDialogProps) {
  const [values, setValues] = useState<SecurityFindingFormValues>(emptyValues());
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues());
      setTitleError(null);
      setDescriptionError(null);
      setRecommendationError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues]);

  const handleSubmit = async () => {
    const trimmedTitle = values.title.trim();
    const trimmedDescription = values.description.trim();
    const trimmedRecommendation = values.recommendation.trim();
    let hasError = false;

    if (!trimmedTitle) {
      setTitleError('Title is required.');
      hasError = true;
    }
    if (!trimmedDescription) {
      setDescriptionError('Description is required.');
      hasError = true;
    }
    if (!trimmedRecommendation) {
      setRecommendationError('Recommendation is required.');
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        title: trimmedTitle,
        description: trimmedDescription,
        severity: values.severity,
        evidence: values.evidence.trim() || undefined,
        recommendation: trimmedRecommendation,
        status: values.status,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save finding.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Report Finding' : 'Edit Finding'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            label="Title"
            required
            fullWidth
            autoFocus
            value={values.title}
            error={Boolean(titleError)}
            helperText={titleError ?? ' '}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, title: e.target.value }));
              if (titleError) setTitleError(null);
            }}
          />

          <TextField
            label="Description"
            required
            fullWidth
            multiline
            minRows={2}
            value={values.description}
            error={Boolean(descriptionError)}
            helperText={descriptionError ?? ' '}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, description: e.target.value }));
              if (descriptionError) setDescriptionError(null);
            }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Severity"
              fullWidth
              value={values.severity}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, severity: e.target.value as FindingSeverity }))
              }
            >
              {ALL_SEVERITIES.map((option) => (
                <MenuItem key={option} value={option}>
                  {SEVERITY_LABELS[option]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              fullWidth
              value={values.status}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, status: e.target.value as VulnerabilityStatus }))
              }
            >
              {ALL_VULN_STATUSES.map((option) => (
                <MenuItem key={option} value={option}>
                  {VULN_STATUS_LABELS[option]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Evidence (optional)"
            fullWidth
            multiline
            minRows={2}
            placeholder="Request/response snippet, log excerpt, screenshot description, etc."
            value={values.evidence}
            onChange={(e) => setValues((prev) => ({ ...prev, evidence: e.target.value }))}
          />

          <TextField
            label="Recommendation"
            required
            fullWidth
            multiline
            minRows={2}
            value={values.recommendation}
            error={Boolean(recommendationError)}
            helperText={recommendationError ?? ' '}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, recommendation: e.target.value }));
              if (recommendationError) setRecommendationError(null);
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {mode === 'create' ? 'Report Finding' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
