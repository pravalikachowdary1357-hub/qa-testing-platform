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
  ApiRequirementPriority,
  ApiRequirementStatus,
  ApiRequirementType,
  CreateRequirementPayload,
} from '../../types/requirement';
import type { ApiProduct } from '../../types/product';
import type { ApiRelease } from '../../types/release';

const TYPE_OPTIONS: { value: ApiRequirementType; label: string }[] = [
  { value: 'FUNCTIONAL', label: 'Functional' },
  { value: 'NON_FUNCTIONAL', label: 'Non-Functional' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'TECHNICAL', label: 'Technical' },
];

const PRIORITY_OPTIONS: { value: ApiRequirementPriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_OPTIONS: { value: ApiRequirementStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IMPLEMENTED', label: 'Implemented' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
];

interface RequirementFormValues {
  productId: string;
  releaseId: string;
  title: string;
  description: string;
  type: ApiRequirementType;
  priority: ApiRequirementPriority;
  status: ApiRequirementStatus;
}

function emptyValues(defaultProductId: string): RequirementFormValues {
  return {
    productId: defaultProductId,
    releaseId: '',
    title: '',
    description: '',
    type: 'FUNCTIONAL',
    priority: 'MEDIUM',
    status: 'DRAFT',
  };
}

interface RequirementFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  releases: ApiRelease[];
  currentProductId?: string;
  initialValues?: RequirementFormValues;
  onClose: () => void;
  onSubmit: (data: CreateRequirementPayload) => Promise<void>;
}

export function RequirementFormDialog({
  open,
  mode,
  products,
  releases,
  currentProductId,
  initialValues,
  onClose,
  onSubmit,
}: RequirementFormDialogProps) {
  const [values, setValues] = useState<RequirementFormValues>(emptyValues(''));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const preferredProductId =
        currentProductId && products.some((p) => p.id === currentProductId)
          ? currentProductId
          : (products[0]?.id ?? '');
      setValues(initialValues ?? emptyValues(preferredProductId));
      setTitleError(null);
      setDescriptionError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products, currentProductId]);

  const noProductsAvailable = mode === 'create' && products.length === 0;

  const releasesForProduct = useMemo(
    () => releases.filter((release) => release.productId === values.productId),
    [releases, values.productId],
  );

  const handleProductChange = (newProductId: string) => {
    setValues((prev) => ({
      ...prev,
      productId: newProductId,
      releaseId: releases.some(
        (r) => r.id === prev.releaseId && r.productId === newProductId,
      )
        ? prev.releaseId
        : '',
    }));
  };

  const handleSubmit = async () => {
    const trimmedTitle = values.title.trim();
    const trimmedDescription = values.description.trim();
    let hasError = false;

    if (!trimmedTitle) {
      setTitleError('Requirement title is required.');
      hasError = true;
    }
    if (!trimmedDescription) {
      setDescriptionError('Requirement description is required.');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        releaseId: values.releaseId || undefined,
        title: trimmedTitle,
        description: trimmedDescription,
        type: values.type,
        priority: values.priority,
        status: values.status,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Requirement' : 'Edit Requirement'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before adding requirements.
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
                minRows={3}
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
                  label="Type"
                  fullWidth
                  value={values.type}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, type: e.target.value as ApiRequirementType }))
                  }
                >
                  {TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Priority"
                  fullWidth
                  value={values.priority}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      priority: e.target.value as ApiRequirementPriority,
                    }))
                  }
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={values.status}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      status: e.target.value as ApiRequirementStatus,
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
          disabled={submitting || noProductsAvailable}
        >
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
