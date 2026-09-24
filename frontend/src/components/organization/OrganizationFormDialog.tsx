import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type {
  ApiOrganizationStatus,
  CreateOrganizationPayload,
} from '../../types/organization';

const STATUS_OPTIONS: { value: ApiOrganizationStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

interface OrganizationFormValues {
  name: string;
  orgKey: string;
  description: string;
  status: ApiOrganizationStatus;
  orgReferenceId: string;
  location: string;
  establishedYear: string;
  email: string;
}

const EMPTY_VALUES: OrganizationFormValues = {
  name: '',
  orgKey: '',
  description: '',
  status: 'ACTIVE',
  orgReferenceId: '',
  location: '',
  establishedYear: '',
  email: '',
};

interface OrganizationFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: OrganizationFormValues;
  onClose: () => void;
  onSubmit: (data: CreateOrganizationPayload) => Promise<void>;
}

export function OrganizationFormDialog({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: OrganizationFormDialogProps) {
  const [values, setValues] = useState<OrganizationFormValues>(EMPTY_VALUES);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? EMPTY_VALUES);
      setNameError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues]);

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setNameError('Organization name is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        name: trimmedName,
        orgKey: values.orgKey.trim().toUpperCase() || undefined,
        description: values.description.trim() || undefined,
        status: values.status,
        orgReferenceId: values.orgReferenceId.trim() || undefined,
        location: values.location.trim() || undefined,
        establishedYear: values.establishedYear.trim()
          ? Number(values.establishedYear.trim())
          : undefined,
        email: values.email.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save organization.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Organization' : 'Edit Organization'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <TextField
            label="Name"
            required
            fullWidth
            autoFocus
            value={values.name}
            error={Boolean(nameError)}
            helperText={nameError ?? ' '}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, name: e.target.value }));
              if (nameError) setNameError(null);
            }}
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Organization ID (optional)"
                fullWidth
                placeholder="e.g. ORG-001"
                value={values.orgReferenceId}
                onChange={(e) => setValues((prev) => ({ ...prev, orgReferenceId: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Organization Key (optional)"
                fullWidth
                placeholder="e.g. QMICS"
                value={values.orgKey}
                onChange={(e) => setValues((prev) => ({ ...prev, orgKey: e.target.value.toUpperCase() }))}
              />
            </Grid>
          </Grid>
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={2}
            value={values.description}
            onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Location (optional)"
                fullWidth
                placeholder="e.g. Bangalore"
                value={values.location}
                onChange={(e) => setValues((prev) => ({ ...prev, location: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Established Year (optional)"
                fullWidth
                type="number"
                placeholder="e.g. 2015"
                value={values.establishedYear}
                onChange={(e) => setValues((prev) => ({ ...prev, establishedYear: e.target.value }))}
              />
            </Grid>
          </Grid>
          <TextField
            label="Email (optional)"
            fullWidth
            type="email"
            placeholder="e.g. info@company.com"
            value={values.email}
            onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
          />
          <TextField
            select
            label="Status"
            fullWidth
            value={values.status}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                status: e.target.value as ApiOrganizationStatus,
              }))
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
