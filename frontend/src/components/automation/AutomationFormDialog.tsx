import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type {
  ApiAutomationFramework,
  ApiAutomationType,
  CreateAutomationPayload,
} from '../../types/automation';
import type { ApiTestCase } from '../../types/testCase';
import type { ApiTestScenario } from '../../types/testScenario';
import type { ApiEnvironment } from '../../types/environment';

const TYPE_OPTIONS: { value: ApiAutomationType; label: string }[] = [
  { value: 'UI', label: 'UI' },
  { value: 'API', label: 'API' },
  { value: 'UNIT', label: 'Unit' },
  { value: 'INTEGRATION', label: 'Integration' },
  { value: 'PERFORMANCE', label: 'Performance' },
];

const FRAMEWORK_OPTIONS: { value: ApiAutomationFramework; label: string }[] = [
  { value: 'PLAYWRIGHT', label: 'Playwright' },
  { value: 'SELENIUM', label: 'Selenium' },
  { value: 'CYPRESS', label: 'Cypress' },
  { value: 'JEST', label: 'Jest' },
  { value: 'POSTMAN', label: 'Postman' },
  { value: 'OTHER', label: 'Other' },
];

const NO_ENVIRONMENT = '' as const;

interface AutomationFormValues {
  testCaseId: string;
  environmentId: string;
  name: string;
  type: ApiAutomationType;
  framework: ApiAutomationFramework;
  description: string;
  schedule: string;
  enabled: boolean;
}

function emptyValues(defaultTestCaseId: string): AutomationFormValues {
  return {
    testCaseId: defaultTestCaseId,
    environmentId: NO_ENVIRONMENT,
    name: '',
    type: 'UI',
    framework: 'PLAYWRIGHT',
    description: '',
    schedule: '',
    enabled: true,
  };
}

interface AutomationFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  testCases: ApiTestCase[];
  testScenarios: ApiTestScenario[];
  environments: ApiEnvironment[];
  initialValues?: AutomationFormValues;
  onClose: () => void;
  onSubmit: (data: CreateAutomationPayload) => Promise<void>;
}

export function AutomationFormDialog({
  open,
  mode,
  testCases,
  testScenarios,
  environments,
  initialValues,
  onClose,
  onSubmit,
}: AutomationFormDialogProps) {
  const [values, setValues] = useState<AutomationFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(testCases[0]?.id ?? ''));
      setNameError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, testCases]);

  const noTestCasesAvailable = mode === 'create' && testCases.length === 0;

  const scenarioProductMap = useMemo(() => {
    const map = new Map<string, string>();
    testScenarios.forEach((scenario) => map.set(scenario.id, scenario.productId));
    return map;
  }, [testScenarios]);

  const selectedTestCase = testCases.find((tc) => tc.id === values.testCaseId);
  const selectedProductId = selectedTestCase
    ? scenarioProductMap.get(selectedTestCase.testScenarioId)
    : undefined;

  const environmentsForProduct = useMemo(
    () => environments.filter((env) => env.productId === selectedProductId),
    [environments, selectedProductId],
  );

  const handleTestCaseChange = (newTestCaseId: string) => {
    const newTestCase = testCases.find((tc) => tc.id === newTestCaseId);
    const newProductId = newTestCase ? scenarioProductMap.get(newTestCase.testScenarioId) : undefined;

    setValues((prev) => ({
      ...prev,
      testCaseId: newTestCaseId,
      environmentId: environments.some(
        (env) => env.id === prev.environmentId && env.productId === newProductId,
      )
        ? prev.environmentId
        : NO_ENVIRONMENT,
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
        testCaseId: values.testCaseId,
        environmentId: values.environmentId || undefined,
        name: trimmedName,
        type: values.type,
        framework: values.framework,
        description: values.description.trim() || undefined,
        schedule: values.schedule.trim() || undefined,
        enabled: values.enabled,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save automation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'New Automation' : 'Edit Automation'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noTestCasesAvailable ? (
            <Alert severity="warning">
              No test cases exist yet. Create a test case before adding an automation.
            </Alert>
          ) : (
            <>
              <TextField
                select
                label="Test Case"
                required
                fullWidth
                value={values.testCaseId}
                onChange={(e) => handleTestCaseChange(e.target.value)}
              >
                {testCases.map((testCase) => (
                  <MenuItem key={testCase.id} value={testCase.id}>
                    {testCase.title}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Environment (optional)"
                fullWidth
                value={values.environmentId}
                helperText={
                  environmentsForProduct.length === 0
                    ? 'No environments exist for this test case’s product yet.'
                    : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, environmentId: e.target.value }))}
              >
                <MenuItem value={NO_ENVIRONMENT}>
                  <em>None</em>
                </MenuItem>
                {environmentsForProduct.map((environment) => (
                  <MenuItem key={environment.id} value={environment.id}>
                    {environment.name}
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Type"
                  fullWidth
                  value={values.type}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, type: e.target.value as ApiAutomationType }))
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
                  label="Framework"
                  fullWidth
                  value={values.framework}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      framework: e.target.value as ApiAutomationFramework,
                    }))
                  }
                >
                  {FRAMEWORK_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <TextField
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              />

              <TextField
                label="Schedule (optional)"
                fullWidth
                placeholder="e.g. Nightly at 2am"
                value={values.schedule}
                onChange={(e) => setValues((prev) => ({ ...prev, schedule: e.target.value }))}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={values.enabled}
                    onChange={(e) => setValues((prev) => ({ ...prev, enabled: e.target.checked }))}
                  />
                }
                label="Enabled"
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
          disabled={submitting || noTestCasesAvailable}
        >
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
