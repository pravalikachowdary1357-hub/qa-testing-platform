import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type {
  ApiTestPlanPriority,
  ApiTestPlanStatus,
  CreateTestPlanPayload,
} from '../../types/testPlan';
import type { ApiProduct } from '../../types/product';
import type { ApiRequirement } from '../../types/requirement';

const STATUS_OPTIONS: { value: ApiTestPlanStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const PRIORITY_OPTIONS: { value: ApiTestPlanPriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

interface TestPlanFormValues {
  productId: string;
  name: string;
  description: string;
  status: ApiTestPlanStatus;
  priority: ApiTestPlanPriority;
  owner: string;
  startDate: string;
  endDate: string;
  requirementIds: string[];
}

function emptyValues(defaultProductId: string): TestPlanFormValues {
  return {
    productId: defaultProductId,
    name: '',
    description: '',
    status: 'DRAFT',
    priority: 'MEDIUM',
    owner: '',
    startDate: '',
    endDate: '',
    requirementIds: [],
  };
}

interface TestPlanFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  requirements: ApiRequirement[];
  initialValues?: TestPlanFormValues;
  onClose: () => void;
  onSubmit: (data: CreateTestPlanPayload) => Promise<void>;
}

export function TestPlanFormDialog({
  open,
  mode,
  products,
  requirements,
  initialValues,
  onClose,
  onSubmit,
}: TestPlanFormDialogProps) {
  const [values, setValues] = useState<TestPlanFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(products[0]?.id ?? ''));
      setNameError(null);
      setDescriptionError(null);
      setOwnerError(null);
      setDateError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products]);

  const noProductsAvailable = mode === 'create' && products.length === 0;

  const requirementsForProduct = useMemo(
    () => requirements.filter((requirement) => requirement.productId === values.productId),
    [requirements, values.productId],
  );

  const handleProductChange = (newProductId: string) => {
    setValues((prev) => ({
      ...prev,
      productId: newProductId,
      requirementIds: prev.requirementIds.filter((id) =>
        requirements.some((r) => r.id === id && r.productId === newProductId),
      ),
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedDescription = values.description.trim();
    const trimmedOwner = values.owner.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('Test plan name is required.');
      hasError = true;
    }
    if (!trimmedDescription) {
      setDescriptionError('Description is required.');
      hasError = true;
    }
    if (!trimmedOwner) {
      setOwnerError('Owner is required.');
      hasError = true;
    }
    if (values.startDate && values.endDate && values.startDate > values.endDate) {
      setDateError('Start date must be on or before end date.');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        name: trimmedName,
        description: trimmedDescription,
        status: values.status,
        priority: values.priority,
        owner: trimmedOwner,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        requirementIds: values.requirementIds,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save test plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Test Plan' : 'Edit Test Plan'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before adding a test plan.
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
                label="Test Plan Name"
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
                  label="Status"
                  fullWidth
                  value={values.status}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, status: e.target.value as ApiTestPlanStatus }))
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
                  label="Priority"
                  fullWidth
                  value={values.priority}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      priority: e.target.value as ApiTestPlanPriority,
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
                  label="Owner"
                  required
                  fullWidth
                  value={values.owner}
                  error={Boolean(ownerError)}
                  helperText={ownerError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, owner: e.target.value }));
                    if (ownerError) setOwnerError(null);
                  }}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={values.startDate}
                  error={Boolean(dateError)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, startDate: e.target.value }));
                    if (dateError) setDateError(null);
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  value={values.endDate}
                  error={Boolean(dateError)}
                  helperText={dateError ?? ' '}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, endDate: e.target.value }));
                    if (dateError) setDateError(null);
                  }}
                />
              </Stack>
              <TextField
                select
                label="Requirements Covered"
                fullWidth
                value={values.requirementIds}
                helperText={
                  requirementsForProduct.length === 0
                    ? 'No requirements exist for this product yet.'
                    : ' '
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = typeof raw === 'string' ? raw.split(',').filter(Boolean) : raw;
                  setValues((prev) => ({ ...prev, requirementIds: next }));
                }}
                slotProps={{
                  select: {
                    multiple: true,
                    renderValue: (selected) => (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => (
                          <Chip
                            key={id}
                            size="small"
                            label={requirementsForProduct.find((r) => r.id === id)?.title ?? id}
                          />
                        ))}
                      </Stack>
                    ),
                  },
                }}
              >
                {requirementsForProduct.map((requirement) => (
                  <MenuItem key={requirement.id} value={requirement.id}>
                    {requirement.title}
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
          disabled={submitting || noProductsAvailable}
        >
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
