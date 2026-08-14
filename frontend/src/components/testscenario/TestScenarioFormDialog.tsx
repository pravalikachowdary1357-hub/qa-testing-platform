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
  ApiTestScenarioPriority,
  ApiTestScenarioStatus,
  ApiTestScenarioType,
  CreateTestScenarioPayload,
} from '../../types/testScenario';
import type { ApiProduct } from '../../types/product';
import type { ApiRequirement } from '../../types/requirement';

const TYPE_OPTIONS: { value: ApiTestScenarioType; label: string }[] = [
  { value: 'FUNCTIONAL', label: 'Functional' },
  { value: 'REGRESSION', label: 'Regression' },
  { value: 'INTEGRATION', label: 'Integration' },
  { value: 'SMOKE', label: 'Smoke' },
  { value: 'EDGE_CASE', label: 'Edge Case' },
];

const PRIORITY_OPTIONS: { value: ApiTestScenarioPriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_OPTIONS: { value: ApiTestScenarioStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY', label: 'Ready' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const NO_REQUIREMENT = '' as const;

interface TestScenarioFormValues {
  productId: string;
  requirementId: string;
  title: string;
  description: string;
  type: ApiTestScenarioType;
  priority: ApiTestScenarioPriority;
  status: ApiTestScenarioStatus;
}

function emptyValues(defaultProductId: string): TestScenarioFormValues {
  return {
    productId: defaultProductId,
    requirementId: NO_REQUIREMENT,
    title: '',
    description: '',
    type: 'FUNCTIONAL',
    priority: 'MEDIUM',
    status: 'DRAFT',
  };
}

interface TestScenarioFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  requirements: ApiRequirement[];
  initialValues?: TestScenarioFormValues;
  onClose: () => void;
  onSubmit: (data: CreateTestScenarioPayload) => Promise<void>;
}

export function TestScenarioFormDialog({
  open,
  mode,
  products,
  requirements,
  initialValues,
  onClose,
  onSubmit,
}: TestScenarioFormDialogProps) {
  const [values, setValues] = useState<TestScenarioFormValues>(emptyValues(''));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(products[0]?.id ?? ''));
      setTitleError(null);
      setDescriptionError(null);
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
      requirementId: requirements.some(
        (r) => r.id === prev.requirementId && r.productId === newProductId,
      )
        ? prev.requirementId
        : NO_REQUIREMENT,
    }));
  };

  const handleSubmit = async () => {
    const trimmedTitle = values.title.trim();
    const trimmedDescription = values.description.trim();
    let hasError = false;

    if (!trimmedTitle) {
      setTitleError('Scenario title is required.');
      hasError = true;
    }
    if (!trimmedDescription) {
      setDescriptionError('Scenario description is required.');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        requirementId: values.requirementId || null,
        title: trimmedTitle,
        description: trimmedDescription,
        type: values.type,
        priority: values.priority,
        status: values.status,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save test scenario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Test Scenario' : 'Edit Test Scenario'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before adding a test scenario.
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
                label="Requirement (optional)"
                fullWidth
                value={values.requirementId}
                helperText={
                  requirementsForProduct.length === 0
                    ? 'No requirements exist for this product yet.'
                    : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, requirementId: e.target.value }))}
              >
                <MenuItem value={NO_REQUIREMENT}>
                  <em>None</em>
                </MenuItem>
                {requirementsForProduct.map((requirement) => (
                  <MenuItem key={requirement.id} value={requirement.id}>
                    {requirement.title}
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
                    setValues((prev) => ({ ...prev, type: e.target.value as ApiTestScenarioType }))
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
                      priority: e.target.value as ApiTestScenarioPriority,
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
                      status: e.target.value as ApiTestScenarioStatus,
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
