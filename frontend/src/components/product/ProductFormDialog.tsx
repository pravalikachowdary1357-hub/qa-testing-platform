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
import type {
  ApiProductStatus,
  ApiReleaseReadiness,
  CreateProductPayload,
} from '../../types/product';
import type { ApiOrganization } from '../../types/organization';
import type { ApiProject } from '../../types/project';
import type { ApiUser } from '../../types/settings';

const NO_OWNER = '' as const;
const NO_PROJECT = '' as const;

function isValidOptionalUrl(value: string): boolean {
  if (value.trim() === '') return true;
  try {
    new URL(value.trim());
    return true;
  } catch {
    return false;
  }
}

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
  projectId: string;
  name: string;
  productKey: string;
  description: string;
  status: ApiProductStatus;
  environment: string;
  release: string;
  applicationUrl: string;
  repositoryUrl: string;
  productOwnerId: string;
  currentVersion: string;
  testCoverage: string;
  passRate: string;
  openDefects: string;
  releaseReadiness: ApiReleaseReadiness;
}

function emptyValues(defaultOrganizationId: string): ProductFormValues {
  return {
    organizationId: defaultOrganizationId,
    projectId: NO_PROJECT,
    name: '',
    productKey: '',
    description: '',
    status: 'ACTIVE',
    environment: '',
    release: '',
    applicationUrl: '',
    repositoryUrl: '',
    productOwnerId: NO_OWNER,
    currentVersion: '',
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
  projects: ApiProject[];
  users: ApiUser[];
  initialValues?: ProductFormValues;
  onClose: () => void;
  onSubmit: (data: CreateProductPayload) => Promise<void>;
}

export function ProductFormDialog({
  open,
  mode,
  organizations,
  projects,
  users,
  initialValues,
  onClose,
  onSubmit,
}: ProductFormDialogProps) {
  const [values, setValues] = useState<ProductFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [productKeyError, setProductKeyError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [environmentError, setEnvironmentError] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [applicationUrlError, setApplicationUrlError] = useState<string | null>(null);
  const [repositoryUrlError, setRepositoryUrlError] = useState<string | null>(null);
  const [testCoverageError, setTestCoverageError] = useState<string | null>(null);
  const [passRateError, setPassRateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(organizations[0]?.id ?? ''));
      setNameError(null);
      setProductKeyError(null);
      setDescriptionError(null);
      setEnvironmentError(null);
      setReleaseError(null);
      setApplicationUrlError(null);
      setRepositoryUrlError(null);
      setTestCoverageError(null);
      setPassRateError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, organizations]);

  const noOrganizationsAvailable = mode === 'create' && organizations.length === 0;

  const projectsForOrganization = useMemo(
    () => projects.filter((project) => project.organizationId === values.organizationId),
    [projects, values.organizationId],
  );

  const handleOrganizationChange = (organizationId: string) => {
    setValues((prev) => ({
      ...prev,
      organizationId,
      projectId: projects.some(
        (project) => project.id === prev.projectId && project.organizationId === organizationId,
      )
        ? prev.projectId
        : NO_PROJECT,
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedDescription = values.description.trim();
    const trimmedEnvironment = values.environment.trim();
    const trimmedRelease = values.release.trim();
    let hasError = false;

    const trimmedProductKey = values.productKey.trim().toUpperCase();

    if (!trimmedName) {
      setNameError('Product name is required.');
      hasError = true;
    }
    if (trimmedProductKey && !/^[A-Z0-9]{2,10}$/.test(trimmedProductKey)) {
      setProductKeyError('Use 2-10 uppercase letters/digits (e.g. CP).');
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
    if (!isValidOptionalUrl(values.applicationUrl)) {
      setApplicationUrlError('Enter a valid URL (e.g. https://app.example.com).');
      hasError = true;
    }
    if (!isValidOptionalUrl(values.repositoryUrl)) {
      setRepositoryUrlError('Enter a valid URL (e.g. https://github.com/org/repo).');
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
        projectId: values.projectId || undefined,
        name: trimmedName,
        productKey: trimmedProductKey || undefined,
        description: trimmedDescription,
        status: values.status,
        environment: trimmedEnvironment,
        release: trimmedRelease,
        applicationUrl: values.applicationUrl.trim() || undefined,
        repositoryUrl: values.repositoryUrl.trim() || undefined,
        productOwnerId: values.productOwnerId || undefined,
        currentVersion: values.currentVersion.trim() || undefined,
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Organization"
                  required
                  fullWidth
                  value={values.organizationId}
                  onChange={(e) => handleOrganizationChange(e.target.value)}
                >
                  {organizations.map((organization) => (
                    <MenuItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Project (optional)"
                  fullWidth
                  value={values.projectId}
                  onChange={(e) => setValues((prev) => ({ ...prev, projectId: e.target.value }))}
                >
                  <MenuItem value={NO_PROJECT}>
                    <em>No project assigned</em>
                  </MenuItem>
                  {projectsForOrganization.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                  label="Product Key (optional)"
                  fullWidth
                  placeholder="e.g. CP"
                  value={values.productKey}
                  error={Boolean(productKeyError)}
                  helperText={productKeyError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, productKey: e.target.value.toUpperCase() }));
                    if (productKeyError) setProductKeyError(null);
                  }}
                />
              </Stack>
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
                  label="Application URL"
                  fullWidth
                  placeholder="https://app.example.com"
                  value={values.applicationUrl}
                  error={Boolean(applicationUrlError)}
                  helperText={applicationUrlError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, applicationUrl: e.target.value }));
                    if (applicationUrlError) setApplicationUrlError(null);
                  }}
                />
                <TextField
                  label="Repository URL"
                  fullWidth
                  placeholder="https://github.com/org/repo"
                  value={values.repositoryUrl}
                  error={Boolean(repositoryUrlError)}
                  helperText={repositoryUrlError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, repositoryUrl: e.target.value }));
                    if (repositoryUrlError) setRepositoryUrlError(null);
                  }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Product Owner"
                  fullWidth
                  value={values.productOwnerId}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, productOwnerId: e.target.value }))
                  }
                >
                  <MenuItem value={NO_OWNER}>
                    <em>No owner assigned</em>
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Current Version"
                  fullWidth
                  placeholder="e.g. 2.4.0"
                  value={values.currentVersion}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, currentVersion: e.target.value }))
                  }
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
