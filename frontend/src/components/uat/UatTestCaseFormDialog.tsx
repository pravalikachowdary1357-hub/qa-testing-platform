import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CreateUatTestCasePayload, UatTestCase, UatTestCaseStepInput } from '../../types/uat';
import type { ApiRequirement } from '../../types/requirement';

function emptyStep(): UatTestCaseStepInput {
  return { action: '', expectedResult: '' };
}

interface UatTestCaseFormValues {
  requirementId: string;
  title: string;
  description: string;
  expectedResult: string;
  assignedTester: string;
  steps: UatTestCaseStepInput[];
}

function emptyValues(): UatTestCaseFormValues {
  return {
    requirementId: '',
    title: '',
    description: '',
    expectedResult: '',
    assignedTester: '',
    steps: [emptyStep()],
  };
}

export function uatTestCaseToFormValues(testCase: UatTestCase): UatTestCaseFormValues {
  return {
    requirementId: testCase.requirementId ?? '',
    title: testCase.title,
    description: testCase.description ?? '',
    expectedResult: testCase.expectedResult,
    assignedTester: testCase.assignedTester,
    steps: testCase.steps.map((step) => ({ action: step.action, expectedResult: step.expectedResult })),
  };
}

interface StepFieldError {
  action?: string;
  expectedResult?: string;
}

interface UatTestCaseFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  productId: string;
  requirements: ApiRequirement[];
  initialValues?: UatTestCaseFormValues;
  onClose: () => void;
  onSubmit: (data: CreateUatTestCasePayload) => Promise<void>;
}

export function UatTestCaseFormDialog({
  open,
  mode,
  productId,
  requirements,
  initialValues,
  onClose,
  onSubmit,
}: UatTestCaseFormDialogProps) {
  const [values, setValues] = useState<UatTestCaseFormValues>(emptyValues());
  const [titleError, setTitleError] = useState<string | null>(null);
  const [expectedResultError, setExpectedResultError] = useState<string | null>(null);
  const [assignedTesterError, setAssignedTesterError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<StepFieldError[]>([]);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues());
      setTitleError(null);
      setExpectedResultError(null);
      setAssignedTesterError(null);
      setStepErrors([]);
      setStepsError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues]);

  const requirementsForProduct = useMemo(
    () => requirements.filter((req) => req.productId === productId),
    [requirements, productId],
  );

  const handleStepChange = (index: number, field: keyof UatTestCaseStepInput, value: string) => {
    setValues((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    }));
    setStepErrors((prev) => prev.map((err, i) => (i === index ? { ...err, [field]: undefined } : err)));
    setStepsError(null);
  };

  const handleAddStep = () => {
    setValues((prev) => ({ ...prev, steps: [...prev.steps, emptyStep()] }));
    setStepErrors((prev) => [...prev, {}]);
  };

  const handleRemoveStep = (index: number) => {
    setValues((prev) => ({
      ...prev,
      steps: prev.steps.length > 1 ? prev.steps.filter((_, i) => i !== index) : prev.steps,
    }));
    setStepErrors((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleSubmit = async () => {
    const trimmedTitle = values.title.trim();
    const trimmedExpectedResult = values.expectedResult.trim();
    const trimmedAssignedTester = values.assignedTester.trim();
    let hasError = false;

    if (!trimmedTitle) {
      setTitleError('Title is required.');
      hasError = true;
    }
    if (!trimmedExpectedResult) {
      setExpectedResultError('Expected result is required.');
      hasError = true;
    }
    if (!trimmedAssignedTester) {
      setAssignedTesterError('Assigned tester is required.');
      hasError = true;
    }

    const trimmedSteps = values.steps.map((step) => ({
      action: step.action.trim(),
      expectedResult: step.expectedResult.trim(),
    }));
    const nextStepErrors = trimmedSteps.map((step) => {
      if (!step.action && !step.expectedResult) return {};
      return {
        action: step.action ? undefined : 'Required.',
        expectedResult: step.expectedResult ? undefined : 'Required.',
      };
    });
    const hasStepFieldError = nextStepErrors.some((err) => err.action || err.expectedResult);
    const meaningfulSteps = trimmedSteps.filter((step) => step.action && step.expectedResult);

    if (hasStepFieldError) {
      setStepErrors(nextStepErrors);
      hasError = true;
    } else if (meaningfulSteps.length === 0) {
      setStepsError('At least one test step with an action and expected result is required.');
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        requirementId: values.requirementId || undefined,
        title: trimmedTitle,
        description: values.description.trim() || undefined,
        expectedResult: trimmedExpectedResult,
        assignedTester: trimmedAssignedTester,
        steps: meaningfulSteps,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save UAT test case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'create' ? 'Add UAT Test Case' : 'Edit UAT Test Case'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <TextField
            select
            label="Requirement (optional)"
            fullWidth
            value={values.requirementId}
            helperText={
              requirementsForProduct.length === 0 ? 'No requirements exist for this product yet.' : ' '
            }
            onChange={(e) => setValues((prev) => ({ ...prev, requirementId: e.target.value }))}
          >
            <MenuItem value="">
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
            label="Description (optional)"
            fullWidth
            multiline
            minRows={2}
            value={values.description}
            onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Steps
            </Typography>
            <Stack spacing={1.5}>
              {values.steps.map((step, index) => (
                <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ pt: 2, width: 20 }}>
                    {index + 1}.
                  </Typography>
                  <TextField
                    label="Action"
                    fullWidth
                    multiline
                    placeholder="What should the business user do?"
                    value={step.action}
                    error={Boolean(stepErrors[index]?.action)}
                    helperText={stepErrors[index]?.action ?? ' '}
                    onChange={(e) => handleStepChange(index, 'action', e.target.value)}
                  />
                  <TextField
                    label="Expected Result"
                    fullWidth
                    multiline
                    placeholder="What should happen after this step?"
                    value={step.expectedResult}
                    error={Boolean(stepErrors[index]?.expectedResult)}
                    helperText={stepErrors[index]?.expectedResult ?? ' '}
                    onChange={(e) => handleStepChange(index, 'expectedResult', e.target.value)}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveStep(index)}
                    disabled={values.steps.length === 1}
                    sx={{ mt: 1 }}
                    aria-label={`Remove step ${index + 1}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            {stepsError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {stepsError}
              </Alert>
            )}
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddStep} sx={{ mt: 1 }}>
              Add Step
            </Button>
          </Box>

          <TextField
            label="Expected Result (overall)"
            required
            fullWidth
            multiline
            minRows={2}
            value={values.expectedResult}
            error={Boolean(expectedResultError)}
            helperText={expectedResultError ?? ' '}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, expectedResult: e.target.value }));
              if (expectedResultError) setExpectedResultError(null);
            }}
          />

          <TextField
            label="Assigned Tester"
            required
            fullWidth
            placeholder="e.g. Jordan Lee (Business Analyst)"
            value={values.assignedTester}
            error={Boolean(assignedTesterError)}
            helperText={assignedTesterError ?? ' '}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, assignedTester: e.target.value }));
              if (assignedTesterError) setAssignedTesterError(null);
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {mode === 'create' ? 'Add Test Case' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export type { UatTestCaseFormValues };
