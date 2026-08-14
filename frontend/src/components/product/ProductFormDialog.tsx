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
  ApiProductStatus,
  ApiReleaseReadiness,
  CreateProductPayload,
} from '../../types/product';
import type { ApiOrganization } from '../../types/organization';

const STATUS_OPTIONS: { value: ApiProductStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'DEPRECATED', label: 'Deprecated' },
];

const READINESS_OPTIONS: { value: ApiReleaseReadiness; label: string }[] = [
  { value: 'READY', label: 'Ready' },
  { value: 'CONDITIONAL', label: 'Conditional' },
  { value: 'NOT_READY', label: 'Not Ready' },
];

interface ProductFormValues {
  organizationId: string;
  name: string;
  description: string;
  status: ApiProductStatus;
  environment: string;
  release: string;
  testCoverage: string;
  passRate: string;
  openDefects: string;
  releaseReadiness: ApiReleaseReadiness;
}

function emptyValues(defaultOrganizationId: string): ProductFormValues {
  return {
    organizationId: defaultOrganizationId,
    name: '',
    description: '',
    status: 'ACTIVE',
    environment: '',
    release: '',
    testCoverage: '',
    passRate: '',
    openDefects: '0',
    releaseReadiness: 'NOT_READY',
  };
}

function isValidPercentage(value: string): boolean {
  if (value.trim() === '') return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

interface ProductFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  organizations: ApiOrganization[];
  initialValues?: ProductFormValues;
  onClose: () => void;
  onSubmit: (data: CreateProductPayload) => Promise<void>;
}

export function ProductFormDialog({
  open,
  mode,
  organizations,
  initialValues,
  onClose,
  onSubmit,
}: ProductFormDialogProps) {
  const [values, setValues] = useState<ProductFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [testCoverageError, setTestCoverageError] = useState<string | null>(null);
  const [passRateError, setPassRateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(organizations[0]?.id ?? ''));
      setNameError(null);
      setDescriptionError(null);
      setEnvironmentError(null);
      setReleaseError(null);
      setTestCoverageError(null);
      setPassRateError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, organizations]);

  const noOrganizationsAvailable = mode === 'create' && organizations.length === 0;

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedDescription = values.description.trim();
    const trimmedEnvironment = values.environment.trim();
    const trimmedRelease = values.release.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('Product name is required.');
      hasError = true;
    }
    if (!trimmedDescription) {
      setDescriptionError('Description is required.');
      hasError = true;
    }
    if (!trimmedEnvironment) {
      setEnvironmentError('Environment is required.');
      hasError = true;
    }
    if (!trimmedRelease) {
      setReleaseError('Release is required.');
      hasError = true;
    }
    if (!isValidPercentage(values.testCoverage)) {
      setTestCoverageError('Enter a whole number between 0 and 100.');
      hasError = true;
    }
    if (!isValidPercentage(values.passRate)) {
      setPassRateError('Enter a whole number between 0 and 100.');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        organizationId: values.organizationId,
        name: trimmedName,
        description: trimmedDescription,
        status: values.status,
        environment: trimmedEnvironment,
        release: trimmedRelease,
        testCoverage: Number(values.testCoverage),
        passRate: Number(values.passRate),
        openDefects: values.openDefects.trim() === '' ? 0 : Number(values.openDefects),
        releaseReadiness: values.releaseReadiness,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Product' : 'Edit Product'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noOrganizationsAvailable ? (
            <Alert severity="warning">
              No organizations exist yet. Create an organization before adding a product.
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
                label="Product Name"
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
                  label="Environment"
                  required
                  fullWidth
                  placeholder="e.g. staging, production"
                  value={values.environment}
                  error={Boolean(environmentError)}
                  helperText={environmentError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, environment: e.target.value }));
                    if (environmentError) setEnvironmentError(null);
                  }}
                />
                <TextField
                  label="Release"
                  required
                  fullWidth
                  placeholder="e.g. 2.4.0"
                  value={values.release}
                  error={Boolean(releaseError)}
                  helperText={releaseError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, release: e.target.value }));
                    if (releaseError) setReleaseError(null);
                  }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={values.status}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, status: e.target.value as ApiProductStatus }))
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Release Readiness"
                  fullWidth
                  value={values.releaseReadiness}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      releaseReadiness: e.target.value as ApiReleaseReadiness,
                    }))
                  }
                >
                  {READINESS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Test Coverage %"
                  required
                  fullWidth
                  type="number"
                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                  value={values.testCoverage}
                  error={Boolean(testCoverageError)}
                  helperText={testCoverageError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, testCoverage: e.target.value }));
                    if (testCoverageError) setTestCoverageError(null);
                  }}
                />
                <TextField
                  label="Pass Rate %"
                  required
                  fullWidth
                  type="number"
                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                  value={values.passRate}
                  error={Boolean(passRateError)}
                  helperText={passRateError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, passRate: e.target.value }));
                    if (passRateError) setPassRateError(null);
                  }}
                />
                <TextField
                  label="Open Defects"
                  fullWidth
                  type="number"
                  slotProps={{ htmlInput: { min: 0 } }}
                  value={values.openDefects}
                  onChange={(e) => setValues((prev) => ({ ...prev, openDefects: e.target.value }))}
                />
              </Stack>
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
