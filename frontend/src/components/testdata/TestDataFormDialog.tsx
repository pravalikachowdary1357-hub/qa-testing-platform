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
import type { ApiTestDataType, CreateTestDataPayload } from '../../types/testData';
import type { ApiTestCase } from '../../types/testCase';

const TYPE_OPTIONS: { value: ApiTestDataType; label: string }[] = [
  { value: 'INPUT', label: 'Input' },
  { value: 'EXPECTED_OUTPUT', label: 'Expected Output' },
  { value: 'CREDENTIALS', label: 'Credentials' },
  { value: 'CONFIGURATION', label: 'Configuration' },
  { value: 'REFERENCE', label: 'Reference' },
];

const NO_TEST_CASE = '' as const;

interface TestDataFormValues {
  testCaseId: string;
  name: string;
  description: string;
  type: ApiTestDataType;
  value: string;
}

function emptyValues(): TestDataFormValues {
  return {
    testCaseId: NO_TEST_CASE,
    name: '',
    description: '',
    type: 'INPUT',
    value: '',
  };
}

interface TestDataFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  testCases: ApiTestCase[];
  initialValues?: TestDataFormValues;
  onClose: () => void;
  onSubmit: (data: CreateTestDataPayload) => Promise<void>;
}

export function TestDataFormDialog({
  open,
  mode,
  testCases,
  initialValues,
  onClose,
  onSubmit,
}: TestDataFormDialogProps) {
  const [values, setValues] = useState<TestDataFormValues>(emptyValues());
  const [nameError, setNameError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues());
      setNameError(null);
      setValueError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues]);

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedValue = values.value.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('Name is required.');
      hasError = true;
    }
    if (!trimmedValue) {
      setValueError('Value is required.');
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        testCaseId: values.testCaseId || null,
        name: trimmedName,
        description: values.description.trim() || undefined,
        type: values.type,
        value: trimmedValue,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save test data.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Test Data' : 'Edit Test Data'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

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
            select
            label="Test Case (optional)"
            fullWidth
            value={values.testCaseId}
            helperText={testCases.length === 0 ? 'No test cases exist yet.' : ' '}
            onChange={(e) => setValues((prev) => ({ ...prev, testCaseId: e.target.value }))}
          >
            <MenuItem value={NO_TEST_CASE}>
              <em>None</em>
            </MenuItem>
            {testCases.map((testCase) => (
              <MenuItem key={testCase.id} value={testCase.id}>
                {testCase.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Type"
            fullWidth
            value={values.type}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, type: e.target.value as ApiTestDataType }))
            }
          >
            {TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Value"
            required
            fullWidth
            multiline
            minRows={3}
            value={values.value}
            error={Boolean(valueError)}
            helperText={valueError ?? 'Stored as-is. Avoid pasting real production secrets.'}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, value: e.target.value }));
              if (valueError) setValueError(null);
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
