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
  ApiDefectPriority,
  ApiDefectSeverity,
  ApiDefectStatus,
  CreateDefectPayload,
} from '../../types/defect';
import type { ApiProduct } from '../../types/product';
import type { ApiEnvironment } from '../../types/environment';
import type { ApiTestCase } from '../../types/testCase';
import type { ApiTestScenario } from '../../types/testScenario';
import type { ApiTestExecution } from '../../types/testExecution';

const SEVERITY_OPTIONS: { value: ApiDefectSeverity; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'MINOR', label: 'Minor' },
  { value: 'TRIVIAL', label: 'Trivial' },
];

const PRIORITY_OPTIONS: { value: ApiDefectPriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_OPTIONS: { value: ApiDefectStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REOPENED', label: 'Reopened' },
  { value: 'CLOSED', label: 'Closed' },
];

const NONE = '' as const;

interface DefectFormValues {
  productId: string;
  environmentId: string;
  testCaseId: string;
  testExecutionId: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: ApiDefectSeverity;
  priority: ApiDefectPriority;
  status: ApiDefectStatus;
  assignedTo: string;
}

interface FieldErrors {
  title?: string;
  description?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
}

function emptyValues(defaultProductId: string): DefectFormValues {
  return {
    productId: defaultProductId,
    environmentId: NONE,
    testCaseId: NONE,
    testExecutionId: NONE,
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
    severity: 'MAJOR',
    priority: 'MEDIUM',
    status: 'OPEN',
    assignedTo: '',
  };
}

interface DefectFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  environments: ApiEnvironment[];
  testCases: ApiTestCase[];
  testScenarios: ApiTestScenario[];
  testExecutions: ApiTestExecution[];
  currentProductId?: string;
  initialValues?: DefectFormValues;
  onClose: () => void;
  onSubmit: (data: CreateDefectPayload) => Promise<void>;
}

export function DefectFormDialog({
  open,
  mode,
  products,
  environments,
  testCases,
  testScenarios,
  testExecutions,
  currentProductId,
  initialValues,
  onClose,
  onSubmit,
}: DefectFormDialogProps) {
  const [values, setValues] = useState<DefectFormValues>(emptyValues(''));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const preferredProductId =
        currentProductId && products.some((p) => p.id === currentProductId)
          ? currentProductId
          : (products[0]?.id ?? '');
      setValues(initialValues ?? emptyValues(preferredProductId));
      setFieldErrors({});
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products, currentProductId]);

  const noProductsAvailable = mode === 'create' && products.length === 0;

  const scenarioProductMap = useMemo(() => {
    const map = new Map<string, string>();
    testScenarios.forEach((scenario) => map.set(scenario.id, scenario.productId));
    return map;
  }, [testScenarios]);

  const environmentsForProduct = useMemo(
    () => environments.filter((env) => env.productId === values.productId),
    [environments, values.productId],
  );

  const testCasesForProduct = useMemo(
    () => testCases.filter((tc) => scenarioProductMap.get(tc.testScenarioId) === values.productId),
    [testCases, scenarioProductMap, values.productId],
  );

  const testExecutionsForProduct = useMemo(
    () =>
      testExecutions.filter((te) => {
        if (te.testCase.testScenario.product.id !== values.productId) return false;
        if (values.testCaseId && te.testCaseId !== values.testCaseId) return false;
        return true;
      }),
    [testExecutions, values.productId, values.testCaseId],
  );

  const handleProductChange = (newProductId: string) => {
    const newTestCaseId = testCases.some(
      (tc) =>
        tc.id === values.testCaseId && scenarioProductMap.get(tc.testScenarioId) === newProductId,
    )
      ? values.testCaseId
      : NONE;

    setValues((prev) => ({
      ...prev,
      productId: newProductId,
      environmentId: environments.some(
        (env) => env.id === prev.environmentId && env.productId === newProductId,
      )
        ? prev.environmentId
        : NONE,
      testCaseId: newTestCaseId,
      testExecutionId: testExecutions.some((te) => {
        if (te.id !== prev.testExecutionId) return false;
        if (te.testCase.testScenario.product.id !== newProductId) return false;
        if (newTestCaseId && te.testCaseId !== newTestCaseId) return false;
        return true;
      })
        ? prev.testExecutionId
        : NONE,
    }));
  };

  const handleTestCaseChange = (newTestCaseId: string) => {
    setValues((prev) => ({
      ...prev,
      testCaseId: newTestCaseId,
      testExecutionId:
        newTestCaseId && prev.testExecutionId
          ? testExecutions.find((te) => te.id === prev.testExecutionId)?.testCaseId ===
            newTestCaseId
            ? prev.testExecutionId
            : NONE
          : prev.testExecutionId,
    }));
  };

  const handleSubmit = async () => {
    const trimmedTitle = values.title.trim();
    const trimmedDescription = values.description.trim();
    const trimmedSteps = values.stepsToReproduce.trim();
    const trimmedExpected = values.expectedResult.trim();
    const trimmedActual = values.actualResult.trim();

    const errors: FieldErrors = {};
    if (!trimmedTitle) errors.title = 'Title is required.';
    if (!trimmedDescription) errors.description = 'Description is required.';
    if (!trimmedSteps) errors.stepsToReproduce = 'Steps to reproduce are required.';
    if (!trimmedExpected) errors.expectedResult = 'Expected result is required.';
    if (!trimmedActual) errors.actualResult = 'Actual result is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        environmentId: values.environmentId || null,
        testCaseId: values.testCaseId || null,
        testExecutionId: values.testExecutionId || null,
        title: trimmedTitle,
        description: trimmedDescription,
        stepsToReproduce: trimmedSteps,
        expectedResult: trimmedExpected,
        actualResult: trimmedActual,
        severity: values.severity,
        priority: values.priority,
        status: values.status,
        assignedTo: values.assignedTo.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save defect.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Report Defect' : 'Edit Defect'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before reporting a defect.
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
                label="Environment (optional)"
                fullWidth
                value={values.environmentId}
                helperText={
                  environmentsForProduct.length === 0
                    ? 'No environments exist for this product yet.'
                    : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, environmentId: e.target.value }))}
              >
                <MenuItem value={NONE}>
                  <em>None</em>
                </MenuItem>
                {environmentsForProduct.map((environment) => (
                  <MenuItem key={environment.id} value={environment.id}>
                    {environment.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Test Case (optional)"
                fullWidth
                value={values.testCaseId}
                helperText={
                  testCasesForProduct.length === 0 ? 'No test cases exist for this product yet.' : ' '
                }
                onChange={(e) => handleTestCaseChange(e.target.value)}
              >
                <MenuItem value={NONE}>
                  <em>None</em>
                </MenuItem>
                {testCasesForProduct.map((testCase) => (
                  <MenuItem key={testCase.id} value={testCase.id}>
                    {testCase.title}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Test Execution (optional)"
                fullWidth
                value={values.testExecutionId}
                helperText={
                  testExecutionsForProduct.length === 0
                    ? 'No test executions exist for this selection yet.'
                    : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, testExecutionId: e.target.value }))}
              >
                <MenuItem value={NONE}>
                  <em>None</em>
                </MenuItem>
                {testExecutionsForProduct.map((execution) => (
                  <MenuItem key={execution.id} value={execution.id}>
                    {execution.testCase.title} · {new Date(execution.executedAt).toLocaleString()}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Title"
                required
                fullWidth
                value={values.title}
                error={Boolean(fieldErrors.title)}
                helperText={fieldErrors.title ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, title: e.target.value }));
                  if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />

              <TextField
                label="Description"
                required
                fullWidth
                multiline
                minRows={2}
                value={values.description}
                error={Boolean(fieldErrors.description)}
                helperText={fieldErrors.description ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, description: e.target.value }));
                  if (fieldErrors.description)
                    setFieldErrors((prev) => ({ ...prev, description: undefined }));
                }}
              />

              <TextField
                label="Steps to Reproduce"
                required
                fullWidth
                multiline
                minRows={3}
                value={values.stepsToReproduce}
                error={Boolean(fieldErrors.stepsToReproduce)}
                helperText={fieldErrors.stepsToReproduce ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, stepsToReproduce: e.target.value }));
                  if (fieldErrors.stepsToReproduce)
                    setFieldErrors((prev) => ({ ...prev, stepsToReproduce: undefined }));
                }}
              />

              <TextField
                label="Expected Result"
                required
                fullWidth
                multiline
                minRows={2}
                value={values.expectedResult}
                error={Boolean(fieldErrors.expectedResult)}
                helperText={fieldErrors.expectedResult ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, expectedResult: e.target.value }));
                  if (fieldErrors.expectedResult)
                    setFieldErrors((prev) => ({ ...prev, expectedResult: undefined }));
                }}
              />

              <TextField
                label="Actual Result"
                required
                fullWidth
                multiline
                minRows={2}
                value={values.actualResult}
                error={Boolean(fieldErrors.actualResult)}
                helperText={fieldErrors.actualResult ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, actualResult: e.target.value }));
                  if (fieldErrors.actualResult)
                    setFieldErrors((prev) => ({ ...prev, actualResult: undefined }));
                }}
              />

              <TextField
                select
                label="Severity"
                fullWidth
                value={values.severity}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, severity: e.target.value as ApiDefectSeverity }))
                }
              >
                {SEVERITY_OPTIONS.map((option) => (
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
                  setValues((prev) => ({ ...prev, priority: e.target.value as ApiDefectPriority }))
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
                  setValues((prev) => ({ ...prev, status: e.target.value as ApiDefectStatus }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Assigned To (optional)"
                fullWidth
                placeholder="e.g. Jordan Lee"
                value={values.assignedTo}
                onChange={(e) => setValues((prev) => ({ ...prev, assignedTo: e.target.value }))}
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
          disabled={submitting || noProductsAvailable || !values.productId}
        >
          {mode === 'create' ? 'Report Defect' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
