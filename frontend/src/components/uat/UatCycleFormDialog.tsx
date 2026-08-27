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
import type { CreateUatCyclePayload, UatCycleListItem, UatCycleStatus } from '../../types/uat';
import { CYCLE_STATUS_LABELS, EDITABLE_CYCLE_STATUSES } from '../../types/uat';
import type { ApiProduct } from '../../types/product';
import type { ApiRelease } from '../../types/release';

export interface UatCycleFormValues {
  productId: string;
  releaseId: string;
  name: string;
  description: string;
  status: UatCycleStatus;
}

function emptyValues(defaultProductId: string): UatCycleFormValues {
  return {
    productId: defaultProductId,
    releaseId: '',
    name: '',
    description: '',
    status: 'PLANNED',
  };
}

export function uatCycleToFormValues(cycle: UatCycleListItem): UatCycleFormValues {
  return {
    productId: cycle.productId,
    releaseId: cycle.releaseId ?? '',
    name: cycle.name,
    description: cycle.description ?? '',
    status: cycle.status,
  };
}

interface UatCycleFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  releases: ApiRelease[];
  currentProductId?: string;
  initialValues?: UatCycleFormValues;
  onClose: () => void;
  onSubmit: (data: CreateUatCyclePayload & { status?: UatCycleStatus }) => Promise<void>;
}

export function UatCycleFormDialog({
  open,
  mode,
  products,
  releases,
  currentProductId,
  initialValues,
  onClose,
  onSubmit,
}: UatCycleFormDialogProps) {
  const [values, setValues] = useState<UatCycleFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
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
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products, currentProductId]);

  const noProductsAvailable = mode === 'create' && products.length === 0;
  // A cycle already APPROVED/REJECTED keeps showing its real status here
  // (read-only-ish, since it's not in the editable option list); the
  // dedicated Sign-Off action is the only way to reach/change those values.
  const statusIsEditable = EDITABLE_CYCLE_STATUSES.includes(values.status);

  const releasesForProduct = useMemo(
    () => releases.filter((release) => release.productId === values.productId),
    [releases, values.productId],
  );

  const handleProductChange = (newProductId: string) => {
    setValues((prev) => ({
      ...prev,
      productId: newProductId,
      releaseId: releases.some((r) => r.id === prev.releaseId && r.productId === newProductId)
        ? prev.releaseId
        : '',
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        releaseId: values.releaseId || undefined,
        name: trimmedName,
        description: values.description.trim() || undefined,
        status: mode === 'edit' && statusIsEditable ? values.status : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save UAT cycle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create UAT Cycle' : 'Edit UAT Cycle'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before starting a UAT cycle.
            </Alert>
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
                label="Release (optional)"
                fullWidth
                value={values.releaseId}
                helperText={
                  releasesForProduct.length === 0 ? 'No releases exist for this product yet.' : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, releaseId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {releasesForProduct.map((release) => (
                  <MenuItem key={release.id} value={release.id}>
                    {release.name} ({release.version})
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
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
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
                      : `This cycle is ${CYCLE_STATUS_LABELS[values.status]} -- use Sign Off to change an approval decision.`
                  }
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, status: e.target.value as UatCycleStatus }))
                  }
                >
                  {statusIsEditable
                    ? EDITABLE_CYCLE_STATUSES.map((status) => (
                        <MenuItem key={status} value={status}>
                          {CYCLE_STATUS_LABELS[status]}
                        </MenuItem>
                      ))
                    : [
                        <MenuItem key={values.status} value={values.status}>
                          {CYCLE_STATUS_LABELS[values.status]}
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
