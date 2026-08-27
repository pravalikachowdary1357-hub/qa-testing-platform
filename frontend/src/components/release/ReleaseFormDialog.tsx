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
import type { ApiRelease, CreateReleasePayload, ReleaseStatus } from '../../types/release';
import { EDITABLE_RELEASE_STATUSES, RELEASE_STATUS_LABELS } from '../../types/release';
import type { ApiProduct } from '../../types/product';
import type { ApiEnvironment } from '../../types/environment';

export interface ReleaseFormValues {
  productId: string;
  environmentId: string;
  name: string;
  version: string;
  status: ReleaseStatus;
  releaseDate: string;
  notes: string;
}

function emptyValues(defaultProductId: string): ReleaseFormValues {
  return {
    productId: defaultProductId,
    environmentId: '',
    name: '',
    version: '',
    status: 'PLANNED',
    releaseDate: '',
    notes: '',
  };
}

export function releaseToFormValues(release: ApiRelease): ReleaseFormValues {
  return {
    productId: release.productId,
    environmentId: release.environmentId ?? '',
    name: release.name,
    version: release.version,
    status: release.status,
    releaseDate: release.releaseDate ? release.releaseDate.slice(0, 10) : '',
    notes: release.notes ?? '',
  };
}

interface ReleaseFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  environments: ApiEnvironment[];
  currentProductId?: string;
  initialValues?: ReleaseFormValues;
  onClose: () => void;
  onSubmit: (data: CreateReleasePayload & { status?: ReleaseStatus }) => Promise<void>;
}

export function ReleaseFormDialog({
  open,
  mode,
  products,
  environments,
  currentProductId,
  initialValues,
  onClose,
  onSubmit,
}: ReleaseFormDialogProps) {
  const [values, setValues] = useState<ReleaseFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const preferredProductId =
        currentProductId && products.some((p) => p.id === currentProductId)
          ? currentProductId
          : (products[0]?.id ?? '');
      setValues(initialValues ?? emptyValues(preferredProductId));
      setNameError(null);
      setVersionError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products, currentProductId]);

  const noProductsAvailable = mode === 'create' && products.length === 0;
  const statusIsEditable = EDITABLE_RELEASE_STATUSES.includes(values.status);

  const environmentsForProduct = useMemo(
    () => environments.filter((env) => env.productId === values.productId),
    [environments, values.productId],
  );

  const handleProductChange = (newProductId: string) => {
    setValues((prev) => ({
      ...prev,
      productId: newProductId,
      environmentId: environments.some(
        (env) => env.id === prev.environmentId && env.productId === newProductId,
      )
        ? prev.environmentId
        : '',
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedVersion = values.version.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('Name is required.');
      hasError = true;
    }
    if (!trimmedVersion) {
      setVersionError('Version is required.');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        environmentId: values.environmentId || undefined,
        name: trimmedName,
        version: trimmedVersion,
        releaseDate: values.releaseDate || undefined,
        notes: values.notes.trim() || undefined,
        status: mode === 'edit' && statusIsEditable ? values.status : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save release.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Release' : 'Edit Release'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">No products exist yet. Create a product before planning a release.</Alert>
          ) : (
            <>
              <TextField
                select
                label="Product"
                required
                fullWidth
                value={values.productId}
                onChange={(e) => handleProductChange(e.target.value)}
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Environment (optional)"
                fullWidth
                value={values.environmentId}
                helperText={
                  environmentsForProduct.length === 0 ? 'No environments exist for this product yet.' : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, environmentId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {environmentsForProduct.map((environment) => (
                  <MenuItem key={environment.id} value={environment.id}>
                    {environment.name}
                  </MenuItem>
                ))}
              </TextField>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Name"
                  required
                  fullWidth
                  autoFocus
                  placeholder="e.g. Spring Launch"
                  value={values.name}
                  error={Boolean(nameError)}
                  helperText={nameError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, name: e.target.value }));
                    if (nameError) setNameError(null);
                  }}
                />
                <TextField
                  label="Version"
                  required
                  fullWidth
                  placeholder="e.g. v2.3.0"
                  value={values.version}
                  error={Boolean(versionError)}
                  helperText={versionError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, version: e.target.value }));
                    if (versionError) setVersionError(null);
                  }}
                />
              </Stack>

              <TextField
                label="Release Date (optional)"
                type="date"
                fullWidth
                value={values.releaseDate}
                slotProps={{ inputLabel: { shrink: true } }}
                onChange={(e) => setValues((prev) => ({ ...prev, releaseDate: e.target.value }))}
              />

              <TextField
                label="Notes (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.notes}
                onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
              />

              {mode === 'edit' && (
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={statusIsEditable ? values.status : ''}
                  disabled={!statusIsEditable}
                  helperText={
                    statusIsEditable
                      ? ' '
                      : `This release is ${RELEASE_STATUS_LABELS[values.status]} -- use Sign Off to change an approval decision.`
                  }
                  onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value as ReleaseStatus }))}
                >
                  {statusIsEditable
                    ? EDITABLE_RELEASE_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {RELEASE_STATUS_LABELS[status]}
                        </MenuItem>
                      ))
                    : [
                        <MenuItem key={values.status} value={values.status}>
                          {RELEASE_STATUS_LABELS[values.status]}
                        </MenuItem>,
                      ]}
                </TextField>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting || noProductsAvailable}>
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
