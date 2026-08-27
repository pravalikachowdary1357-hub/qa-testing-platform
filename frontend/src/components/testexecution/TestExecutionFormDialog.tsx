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
  Typography,
} from '@mui/material';
import type {
  ApiTestExecutionStatus,
  CreateTestExecutionPayload,
} from '../../types/testExecution';
import type { ApiTestCase } from '../../types/testCase';
import type { ApiTestScenario } from '../../types/testScenario';
import type { ApiEnvironment } from '../../types/environment';
import type { ApiTestDataListItem } from '../../types/testData';
import type { ApiRelease } from '../../types/release';

const STATUS_OPTIONS: { value: ApiTestExecutionStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PASS', label: 'Pass' },
  { value: 'FAIL', label: 'Fail' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const NO_TEST_DATA = '' as const;

interface TestExecutionFormValues {
  testCaseId: string;
  environmentId: string;
  testDataId: string;
  releaseId: string;
  status: ApiTestExecutionStatus;
  actualResult: string;
  notes: string;
  executedBy: string;
}

function emptyValues(defaultTestCaseId: string): TestExecutionFormValues {
  return {
    testCaseId: defaultTestCaseId,
    environmentId: '',
    testDataId: NO_TEST_DATA,
    releaseId: '',
    status: 'PENDING',
    actualResult: '',
    notes: '',
    executedBy: '',
  };
}

interface TestExecutionFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  testCases: ApiTestCase[];
  testScenarios: ApiTestScenario[];
  environments: ApiEnvironment[];
  testDataList: ApiTestDataListItem[];
  releases: ApiRelease[];
  initialValues?: TestExecutionFormValues;
  onClose: () => void;
  onSubmit: (data: CreateTestExecutionPayload) => Promise<void>;
}

export function TestExecutionFormDialog({
  open,
  mode,
  testCases,
  testScenarios,
  environments,
  testDataList,
  releases,
  initialValues,
  onClose,
  onSubmit,
}: TestExecutionFormDialogProps) {
  const [values, setValues] = useState<TestExecutionFormValues>(emptyValues(''));
  const [executedByError, setExecutedByError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(testCases[0]?.id ?? ''));
      setExecutedByError(null);
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

  const testDataForCase = useMemo(
    () =>
      testDataList.filter(
        (item) => item.testCaseId === null || item.testCaseId === values.testCaseId,
      ),
    [testDataList, values.testCaseId],
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
        : '',
      testDataId: testDataList.some(
        (item) =>
          item.id === prev.testDataId &&
          (item.testCaseId === null || item.testCaseId === newTestCaseId),
      )
        ? prev.testDataId
        : NO_TEST_DATA,
    }));
  };

  const handleSubmit = async () => {
    const trimmedExecutedBy = values.executedBy.trim();
    if (!trimmedExecutedBy) {
      setExecutedByError('Executed by is required.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        testCaseId: values.testCaseId,
        environmentId: values.environmentId,
        testDataId: values.testDataId || null,
        releaseId: values.releaseId || undefined,
        status: values.status,
        actualResult: values.actualResult.trim() || undefined,
        notes: values.notes.trim() || undefined,
        executedBy: trimmedExecutedBy,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save test execution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Start Test Execution' : 'Edit Test Execution'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noTestCasesAvailable ? (
            <Alert severity="warning">
              No test cases exist yet. Create a test case before starting an execution.
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

              {selectedTestCase && (
                <Typography variant="body2" color="text.secondary">
                  Expected result: {selectedTestCase.expectedResult}
                </Typography>
              )}

              <TextField
                select
                label="Environment"
                required
                fullWidth
                value={values.environmentId}
                helperText={
                  environmentsForProduct.length === 0
                    ? 'No environments exist for this test case’s product yet.'
                    : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, environmentId: e.target.value }))}
              >
                {environmentsForProduct.map((environment) => (
                  <MenuItem key={environment.id} value={environment.id}>
                    {environment.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Test Data (optional)"
                fullWidth
                value={values.testDataId}
                helperText={
                  testDataForCase.length === 0
                    ? 'No applicable test data exists for this test case yet.'
                    : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, testDataId: e.target.value }))}
              >
                <MenuItem value={NO_TEST_DATA}>
                  <em>None</em>
                </MenuItem>
                {testDataForCase.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
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
                select
                label="Status"
                fullWidth
                value={values.status}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, status: e.target.value as ApiTestExecutionStatus }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Actual Result (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.actualResult}
                onChange={(e) => setValues((prev) => ({ ...prev, actualResult: e.target.value }))}
              />

              <TextField
                label="Notes (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.notes}
                onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
              />

              <TextField
                label="Executed By"
                required
                fullWidth
                placeholder="e.g. Jordan Lee"
                value={values.executedBy}
                error={Boolean(executedByError)}
                helperText={executedByError ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, executedBy: e.target.value }));
                  if (executedByError) setExecutedByError(null);
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
          disabled={submitting || noTestCasesAvailable || !values.environmentId}
        >
          {mode === 'create' ? 'Start Execution' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
