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
import { AcceptanceCriteriaEditor } from './AcceptanceCriteriaEditor';
import type {
  ApiRequirementPriority,
  ApiRequirementRisk,
  ApiRequirementStatus,
  ApiRequirementType,
  CreateRequirementPayload,
} from '../../types/requirement';
import type { ApiProduct } from '../../types/product';
import type { ApiRelease } from '../../types/release';
import type { ApiUser } from '../../types/settings';

const NO_OWNER = '' as const;

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

const RISK_OPTIONS: { value: ApiRequirementRisk; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

// APPROVED/REJECTED are only reachable via the dedicated review action (see
// RequirementApprovalTab) -- offering them here would let any editor bypass
// the approval workflow, which the backend also rejects with a 400.
const STATUS_OPTIONS: { value: ApiRequirementStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_REVIEW', label: 'In Review' },
];

const STATUS_LABELS: Record<ApiRequirementStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  IMPLEMENTED: 'Implemented',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

interface RequirementFormValues {
  productId: string;
  releaseId: string;
  title: string;
  description: string;
  type: ApiRequirementType;
  priority: ApiRequirementPriority;
  riskLevel: ApiRequirementRisk;
  status: ApiRequirementStatus;
  ownerId: string;
  acceptanceCriteria: string[];
}

function emptyValues(defaultProductId: string): RequirementFormValues {
  return {
    productId: defaultProductId,
    releaseId: '',
    title: '',
    description: '',
    type: 'FUNCTIONAL',
    priority: 'MEDIUM',
    riskLevel: 'MEDIUM',
    status: 'DRAFT',
    ownerId: NO_OWNER,
    acceptanceCriteria: [],
  };
}

interface RequirementFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  releases: ApiRelease[];
  users: ApiUser[];
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
  users,
  currentProductId,
  initialValues,
  onClose,
  onSubmit,
}: RequirementFormDialogProps) {
  const [values, setValues] = useState<RequirementFormValues>(emptyValues(''));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [criteriaErrors, setCriteriaErrors] = useState<(string | null)[]>([]);
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
      setCriteriaErrors([]);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products, currentProductId]);

  const noProductsAvailable = mode === 'create' && products.length === 0;

  const releasesForProduct = useMemo(
    () => releases.filter((release) => release.productId === values.productId),
    [releases, values.productId],
  );

  // Editing a requirement that's already moved past Draft/In Review (e.g.
  // Approved, Implemented) -- keep its current value selectable (read-only
  // in effect, since nothing else is offered) instead of showing MUI's
  // "out of range value" warning for a select whose value isn't an option.
  const statusOptions = useMemo(() => {
    if (STATUS_OPTIONS.some((o) => o.value === values.status)) return STATUS_OPTIONS;
    return [...STATUS_OPTIONS, { value: values.status, label: STATUS_LABELS[values.status] }];
  }, [values.status]);

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

    const nextCriteriaErrors = values.acceptanceCriteria.map((text) =>
      text.trim() ? null : 'A criterion cannot be empty.',
    );
    if (nextCriteriaErrors.some(Boolean)) {
      setCriteriaErrors(nextCriteriaErrors);
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
        riskLevel: values.riskLevel,
        status: values.status,
        ownerId: values.ownerId || undefined,
        acceptanceCriteria: values.acceptanceCriteria.map((text) => text.trim()).filter(Boolean),
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                  select
                  label="Owner (optional)"
                  fullWidth
                  value={values.ownerId}
                  onChange={(e) => setValues((prev) => ({ ...prev, ownerId: e.target.value }))}
                >
                  <MenuItem value={NO_OWNER}>
                    <em>No owner assigned</em>
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                      {user.status === 'INACTIVE' ? ' (Inactive)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
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
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Risk"
                  fullWidth
                  helperText="Impact if this requirement fails, distinct from Priority"
                  value={values.riskLevel}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      riskLevel: e.target.value as ApiRequirementRisk,
                    }))
                  }
                >
                  {RISK_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Status"
                  fullWidth
                  helperText={mode === 'edit' ? 'Use the Approval tab to approve or reject.' : ' '}
                  value={values.status}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      status: e.target.value as ApiRequirementStatus,
                    }))
                  }
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <AcceptanceCriteriaEditor
                criteria={values.acceptanceCriteria}
                errors={criteriaErrors}
                onChange={(criteria) => {
                  setValues((prev) => ({ ...prev, acceptanceCriteria: criteria }));
                  setCriteriaErrors([]);
                }}
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
