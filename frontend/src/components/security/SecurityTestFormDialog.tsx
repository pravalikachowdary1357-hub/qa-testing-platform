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
import type { CreateSecurityTestPayload, SecurityTest, SecurityTestType } from '../../types/securityTesting';
import { TEST_TYPE_LABELS } from '../../types/securityTesting';
import type { ApiProduct } from '../../types/product';
import type { ApiEnvironment } from '../../types/environment';
import type { ApiTestCase } from '../../types/testCase';
import type { ApiTestScenario } from '../../types/testScenario';

const TEST_TYPE_OPTIONS: SecurityTestType[] = [
  'SAST',
  'DAST',
  'PENETRATION_TEST',
  'VULNERABILITY_SCAN',
  'DEPENDENCY_SCAN',
  'CONFIGURATION_AUDIT',
  'CODE_REVIEW',
  'OTHER',
];

export interface SecurityTestFormValues {
  productId: string;
  environmentId: string;
  testCaseId: string;
  name: string;
  description: string;
  target: string;
  testType: SecurityTestType;
  configuration: string;
}

function emptyValues(defaultProductId: string): SecurityTestFormValues {
  return {
    productId: defaultProductId,
    environmentId: '',
    testCaseId: '',
    name: '',
    description: '',
    target: '',
    testType: 'VULNERABILITY_SCAN',
    configuration: '',
  };
}

export function securityTestToFormValues(test: SecurityTest): SecurityTestFormValues {
  return {
    productId: test.productId,
    environmentId: test.environmentId ?? '',
    testCaseId: test.testCaseId ?? '',
    name: test.name,
    description: test.description ?? '',
    target: test.target,
    testType: test.testType,
    configuration: test.configuration ?? '',
  };
}

interface SecurityTestFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  environments: ApiEnvironment[];
  testCases: ApiTestCase[];
  testScenarios: ApiTestScenario[];
  currentProductId?: string;
  initialValues?: SecurityTestFormValues;
  onClose: () => void;
  onSubmit: (data: CreateSecurityTestPayload) => Promise<void>;
}

export function SecurityTestFormDialog({
  open,
  mode,
  products,
  environments,
  testCases,
  testScenarios,
  currentProductId,
  initialValues,
  onClose,
  onSubmit,
}: SecurityTestFormDialogProps) {
  const [values, setValues] = useState<SecurityTestFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const preferredProductId =
        currentProductId && products.some((p) => p.id === currentProductId)
          ? currentProductId
          : (products[0]?.id ?? '');
      setValues(initialValues ?? emptyValues(preferredProductId));
      setNameError(null);
      setTargetError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products, currentProductId]);

  const noProductsAvailable = mode === 'create' && products.length === 0;

  // TestCase has no productId of its own -- it's derived transitively via
  // testScenario, mirroring the same lookup DefectFormDialog uses.
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

  const handleProductChange = (newProductId: string) => {
    setValues((prev) => ({
      ...prev,
      productId: newProductId,
      environmentId: environments.some(
        (env) => env.id === prev.environmentId && env.productId === newProductId,
      )
        ? prev.environmentId
        : '',
      testCaseId: testCases.some(
        (tc) => tc.id === prev.testCaseId && scenarioProductMap.get(tc.testScenarioId) === newProductId,
      )
        ? prev.testCaseId
        : '',
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedTarget = values.target.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('Name is required.');
      hasError = true;
    }
    if (!trimmedTarget) {
      setTargetError('Target is required.');
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        environmentId: values.environmentId || undefined,
        testCaseId: values.testCaseId || undefined,
        name: trimmedName,
        description: values.description.trim() || undefined,
        target: trimmedTarget,
        testType: values.testType,
        configuration: values.configuration.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save security test.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Security Test' : 'Edit Security Test'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before adding a security test.
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
                  environmentsForProduct.length === 0 ? 'No environments exist for this product yet.' : ' '
                }
                onChange={(e) => setValues((prev) => ({ ...prev, environmentId: e.target.value }))}
              >
                <MenuItem value="">
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
                onChange={(e) => setValues((prev) => ({ ...prev, testCaseId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {testCasesForProduct.map((testCase) => (
                  <MenuItem key={testCase.id} value={testCase.id}>
                    {testCase.title}
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

              <TextField
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                value={values.description}
                onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              />

              <TextField
                label="Target / Application"
                required
                fullWidth
                placeholder="e.g. https://app.example.com or the Checkout Service"
                value={values.target}
                error={Boolean(targetError)}
                helperText={targetError ?? ' '}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, target: e.target.value }));
                  if (targetError) setTargetError(null);
                }}
              />

              <TextField
                select
                label="Test Type"
                fullWidth
                value={values.testType}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, testType: e.target.value as SecurityTestType }))
                }
              >
                {TEST_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {TEST_TYPE_LABELS[option]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Test Configuration (optional)"
                fullWidth
                multiline
                minRows={2}
                placeholder="Scope, tooling, rules of engagement, credentials used, etc."
                value={values.configuration}
                onChange={(e) => setValues((prev) => ({ ...prev, configuration: e.target.value }))}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting || noProductsAvailable}>
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
