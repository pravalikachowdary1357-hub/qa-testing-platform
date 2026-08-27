import { useEffect, useState } from 'react';
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
import type {
  ApiTestCasePriority,
  ApiTestCaseStatus,
  CreateTestCasePayload,
  TestCaseStepInput,
} from '../../types/testCase';
import type { ApiTestScenario } from '../../types/testScenario';
import type { ApiRelease } from '../../types/release';

const PRIORITY_OPTIONS: { value: ApiTestCasePriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_OPTIONS: { value: ApiTestCaseStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY', label: 'Ready' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DEPRECATED', label: 'Deprecated' },
];

function emptyStep(): TestCaseStepInput {
  return { action: '', expectedResult: '' };
}

interface TestCaseFormValues {
  testScenarioId: string;
  title: string;
  description: string;
  preconditions: string;
  expectedResult: string;
  priority: ApiTestCasePriority;
  status: ApiTestCaseStatus;
  releaseId: string;
  steps: TestCaseStepInput[];
}

function emptyValues(defaultScenarioId: string): TestCaseFormValues {
  return {
    testScenarioId: defaultScenarioId,
    title: '',
    description: '',
    preconditions: '',
    expectedResult: '',
    priority: 'MEDIUM',
    status: 'DRAFT',
    releaseId: '',
    steps: [emptyStep()],
  };
}

interface StepFieldError {
  action?: string;
  expectedResult?: string;
}

interface TestCaseFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  testScenarios: ApiTestScenario[];
  releases: ApiRelease[];
  initialValues?: TestCaseFormValues;
  onClose: () => void;
  onSubmit: (data: CreateTestCasePayload) => Promise<void>;
}

export function TestCaseFormDialog({
  open,
  mode,
  testScenarios,
  releases,
  initialValues,
  onClose,
  onSubmit,
}: TestCaseFormDialogProps) {
  const [values, setValues] = useState<TestCaseFormValues>(emptyValues(''));
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [expectedResultError, setExpectedResultError] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<StepFieldError[]>([]);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(testScenarios[0]?.id ?? ''));
      setTitleError(null);
      setDescriptionError(null);
      setExpectedResultError(null);
      setStepErrors([]);
      setStepsError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, testScenarios]);

  const noScenariosAvailable = mode === 'create' && testScenarios.length === 0;

  const handleStepChange = (index: number, field: keyof TestCaseStepInput, value: string) => {
    setValues((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    }));
    setStepErrors((prev) =>
      prev.map((err, i) => (i === index ? { ...err, [field]: undefined } : err)),
    );
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
    const trimmedDescription = values.description.trim();
    const trimmedExpectedResult = values.expectedResult.trim();
    let hasError = false;

    if (!trimmedTitle) {
      setTitleError('Title is required.');
      hasError = true;
    }
    if (!trimmedDescription) {
      setDescriptionError('Description is required.');
      hasError = true;
    }
    if (!trimmedExpectedResult) {
      setExpectedResultError('Expected result is required.');
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
        testScenarioId: values.testScenarioId,
        title: trimmedTitle,
        description: trimmedDescription,
        preconditions: values.preconditions.trim() || undefined,
        expectedResult: trimmedExpectedResult,
        priority: values.priority,
        status: values.status,
        releaseId: values.releaseId || undefined,
        steps: meaningfulSteps,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save test case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'create' ? 'Create Test Case' : 'Edit Test Case'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noScenariosAvailable ? (
            <Alert severity="warning">
              No test scenarios exist yet. Create a test scenario before adding a test case.
            </Alert>
          ) : (
            <>
              <TextField
                select
                label="Test Scenario"
                required
                fullWidth
                value={values.testScenarioId}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, testScenarioId: e.target.value }))
                }
              >
                {testScenarios.map((scenario) => (
                  <MenuItem key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Release (optional)"
                fullWidth
                value={values.releaseId}
                onChange={(e) => setValues((prev) => ({ ...prev, releaseId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {releases.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name} ({r.version}) — {r.product.name}
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
                minRows={2}
                value={values.description}
                error={Boolean(descriptionError)}
                helperText={descriptionError ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, description: e.target.value }));
                  if (descriptionError) setDescriptionError(null);
                }}
              />
              <TextField
                label="Preconditions (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.preconditions}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, preconditions: e.target.value }))
                }
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Steps
                </Typography>
                <Stack spacing={1.5}>
                  {values.steps.map((step, index) => (
                    <Stack
                      key={index}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <Typography variant="body2" color="text.secondary" sx={{ pt: 2, width: 20 }}>
                        {index + 1}.
                      </Typography>
                      <TextField
                        label="Action"
                        fullWidth
                        multiline
                        placeholder="What should the tester do?"
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
                        onChange={(e) =>
                          handleStepChange(index, 'expectedResult', e.target.value)
                        }
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
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddStep}
                  sx={{ mt: 1 }}
                >
                  Add Step
                </Button>
              </Box>

              <TextField
                label="Expected Result (overall)"
                required
                fullWidth
                multiline
                minRows={2}
                placeholder="Describe the overall expected outcome for this test case"
                value={values.expectedResult}
                error={Boolean(expectedResultError)}
                helperText={expectedResultError ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, expectedResult: e.target.value }));
                  if (expectedResultError) setExpectedResultError(null);
                }}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Priority"
                  fullWidth
                  value={values.priority}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      priority: e.target.value as ApiTestCasePriority,
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
                      status: e.target.value as ApiTestCaseStatus,
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
          disabled={submitting || noScenariosAvailable}
        >
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
