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
  ApiEnvironmentStatus,
  ApiEnvironmentType,
  CreateEnvironmentPayload,
} from '../../types/environment';
import type { ApiProduct } from '../../types/product';

const TYPE_OPTIONS: { value: ApiEnvironmentType; label: string }[] = [
  { value: 'DEVELOPMENT', label: 'Development' },
  { value: 'QA', label: 'QA' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'UAT', label: 'UAT' },
  { value: 'PRODUCTION', label: 'Production' },
];

const STATUS_OPTIONS: { value: ApiEnvironmentStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

interface EnvironmentFormValues {
  productId: string;
  name: string;
  type: ApiEnvironmentType;
  status: ApiEnvironmentStatus;
  baseUrl: string;
  description: string;
}

function emptyValues(defaultProductId: string): EnvironmentFormValues {
  return {
    productId: defaultProductId,
    name: '',
    type: 'DEVELOPMENT',
    status: 'ACTIVE',
    baseUrl: '',
    description: '',
  };
}

interface EnvironmentFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  initialValues?: EnvironmentFormValues;
  onClose: () => void;
  onSubmit: (data: CreateEnvironmentPayload) => Promise<void>;
}

export function EnvironmentFormDialog({
  open,
  mode,
  products,
  initialValues,
  onClose,
  onSubmit,
}: EnvironmentFormDialogProps) {
  const [values, setValues] = useState<EnvironmentFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(products[0]?.id ?? ''));
      setNameError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products]);

  const noProductsAvailable = mode === 'create' && products.length === 0;

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    if (!trimmedName) {
      setNameError('Environment name is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        name: trimmedName,
        type: values.type,
        status: values.status,
        baseUrl: values.baseUrl.trim() || undefined,
        description: values.description.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save environment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Environment' : 'Edit Environment'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before adding an environment.
            </Alert>
          ) : (
            <>
              <TextField
                select
                label="Product"
                required
                fullWidth
                value={values.productId}
                onChange={(e) => setValues((prev) => ({ ...prev, productId: e.target.value }))}
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Name"
                required
                fullWidth
                autoFocus
                placeholder="e.g. Staging"
                value={values.name}
                error={Boolean(nameError)}
                helperText={nameError ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, name: e.target.value }));
                  if (nameError) setNameError(null);
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Type"
                  fullWidth
                  value={values.type}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, type: e.target.value as ApiEnvironmentType }))
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
                  label="Status"
                  fullWidth
                  value={values.status}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      status: e.target.value as ApiEnvironmentStatus,
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
              <TextField
                label="Base URL (optional)"
                fullWidth
                placeholder="https://staging.example.com"
                value={values.baseUrl}
                onChange={(e) => setValues((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
              <TextField
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
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
          disabled={submitting || noProductsAvailable}
        >
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
