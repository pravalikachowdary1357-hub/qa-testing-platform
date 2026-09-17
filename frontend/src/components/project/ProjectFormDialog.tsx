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
import type { ApiProjectStatus, CreateProjectPayload } from '../../types/project';
import type { ApiOrganization } from '../../types/organization';

const STATUS_OPTIONS: { value: ApiProjectStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

interface ProjectFormValues {
  organizationId: string;
  name: string;
  description: string;
  status: ApiProjectStatus;
}

function emptyValues(defaultOrganizationId: string): ProjectFormValues {
  return {
    organizationId: defaultOrganizationId,
    name: '',
    description: '',
    status: 'ACTIVE',
  };
}

interface ProjectFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  organizations: ApiOrganization[];
  initialValues?: ProjectFormValues;
  onClose: () => void;
  onSubmit: (data: CreateProjectPayload) => Promise<void>;
}

export function ProjectFormDialog({
  open,
  mode,
  organizations,
  initialValues,
  onClose,
  onSubmit,
}: ProjectFormDialogProps) {
  const [values, setValues] = useState<ProjectFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(organizations[0]?.id ?? ''));
      setNameError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, organizations]);

  const noOrganizationsAvailable = mode === 'create' && organizations.length === 0;

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setNameError('Project name is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        organizationId: values.organizationId,
        name: trimmedName,
        description: values.description.trim() || undefined,
        status: values.status,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Project' : 'Edit Project'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noOrganizationsAvailable ? (
            <Alert severity="warning">
              No organizations exist yet. Create an organization before adding a project.
            </Alert>
          ) : (
            <>
              <TextField
                select
                label="Organization"
                required
                fullWidth
                value={values.organizationId}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, organizationId: e.target.value }))
                }
              >
                {organizations.map((organization) => (
                  <MenuItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </MenuItem>
                ))}
              </TextField>
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
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={2}
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              />
              <TextField
                select
                label="Status"
                fullWidth
                value={values.status}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    status: e.target.value as ApiProjectStatus,
                  }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
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
          disabled={submitting || noOrganizationsAvailable}
        >
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
