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
import type {
  CreatePerformanceTestPayload,
  PerfHttpMethod,
  PerformanceTest,
} from '../../types/performanceTesting';
import type { ApiProduct } from '../../types/product';
import type { ApiEnvironment } from '../../types/environment';

const METHOD_OPTIONS: PerfHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface HeaderRow {
  key: string;
  value: string;
}

function emptyRow(): HeaderRow {
  return { key: '', value: '' };
}

function recordToRows(record: Record<string, string> | null | undefined): HeaderRow[] {
  const entries = record ? Object.entries(record) : [];
  return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [emptyRow()];
}

function rowsToRecord(rows: HeaderRow[]): Record<string, string> | undefined {
  const record: Record<string, string> = {};
  rows.forEach((row) => {
    const key = row.key.trim();
    if (key) record[key] = row.value;
  });
  return Object.keys(record).length > 0 ? record : undefined;
}

export interface PerformanceTestFormValues {
  productId: string;
  environmentId: string;
  name: string;
  description: string;
  targetUrl: string;
  method: PerfHttpMethod;
  headerRows: HeaderRow[];
  bodyText: string;
  virtualUsers: string;
  rampUpSeconds: string;
  durationSeconds: string;
  iterations: string;
  thresholdResponseTimeMs: string;
  thresholdErrorRatePercent: string;
  thresholdThroughputRps: string;
}

function emptyValues(defaultProductId: string): PerformanceTestFormValues {
  return {
    productId: defaultProductId,
    environmentId: '',
    name: '',
    description: '',
    targetUrl: '',
    method: 'GET',
    headerRows: [emptyRow()],
    bodyText: '',
    virtualUsers: '5',
    rampUpSeconds: '0',
    durationSeconds: '10',
    iterations: '',
    thresholdResponseTimeMs: '',
    thresholdErrorRatePercent: '',
    thresholdThroughputRps: '',
  };
}

export function performanceTestToFormValues(test: PerformanceTest): PerformanceTestFormValues {
  return {
    productId: test.productId,
    environmentId: test.environmentId ?? '',
    name: test.name,
    description: test.description ?? '',
    targetUrl: test.targetUrl,
    method: test.method,
    headerRows: recordToRows(test.headers),
    bodyText: test.body ?? '',
    virtualUsers: String(test.virtualUsers),
    rampUpSeconds: String(test.rampUpSeconds),
    durationSeconds: String(test.durationSeconds),
    iterations: test.iterations != null ? String(test.iterations) : '',
    thresholdResponseTimeMs:
      test.thresholdResponseTimeMs != null ? String(test.thresholdResponseTimeMs) : '',
    thresholdErrorRatePercent:
      test.thresholdErrorRatePercent != null ? String(test.thresholdErrorRatePercent) : '',
    thresholdThroughputRps:
      test.thresholdThroughputRps != null ? String(test.thresholdThroughputRps) : '',
  };
}

interface HeaderRowsEditorProps {
  rows: HeaderRow[];
  onChange: (rows: HeaderRow[]) => void;
}

function HeaderRowsEditor({ rows, onChange }: HeaderRowsEditorProps) {
  const handleRowChange = (index: number, field: keyof HeaderRow, value: string) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };
  const handleAddRow = () => onChange([...rows, emptyRow()]);
  const handleRemoveRow = (index: number) => onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : rows);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Headers
      </Typography>
      <Stack spacing={1.5}>
        {rows.map((row, index) => (
          <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <TextField
              label="Key"
              fullWidth
              placeholder="Header name"
              value={row.key}
              onChange={(e) => handleRowChange(index, 'key', e.target.value)}
            />
            <TextField
              label="Value"
              fullWidth
              placeholder="Header value"
              value={row.value}
              onChange={(e) => handleRowChange(index, 'value', e.target.value)}
            />
            <IconButton
              size="small"
              onClick={() => handleRemoveRow(index)}
              disabled={rows.length === 1}
              sx={{ mt: 1 }}
              aria-label={`Remove header row ${index + 1}`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow} sx={{ mt: 1 }}>
        Add Header
      </Button>
    </Box>
  );
}

interface PerformanceTestFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  environments: ApiEnvironment[];
  initialValues?: PerformanceTestFormValues;
  onClose: () => void;
  onSubmit: (data: CreatePerformanceTestPayload) => Promise<void>;
}

export function PerformanceTestFormDialog({
  open,
  mode,
  products,
  environments,
  initialValues,
  onClose,
  onSubmit,
}: PerformanceTestFormDialogProps) {
  const [values, setValues] = useState<PerformanceTestFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [vuError, setVuError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(products[0]?.id ?? ''));
      setNameError(null);
      setUrlError(null);
      setVuError(null);
      setDurationError(null);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open, initialValues, products]);

  const noProductsAvailable = mode === 'create' && products.length === 0;

  const environmentsForProduct = useMemo(
    () => environments.filter((env) => env.productId === values.productId),
    [environments, values.productId],
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
    }));
  };

  const handleSubmit = async () => {
    const trimmedName = values.name.trim();
    const trimmedUrl = values.targetUrl.trim();
    const virtualUsers = Number(values.virtualUsers);
    const durationSeconds = Number(values.durationSeconds);
    let hasError = false;

    if (!trimmedName) {
      setNameError('Name is required.');
      hasError = true;
    }
    if (!trimmedUrl) {
      setUrlError('Target URL is required.');
      hasError = true;
    }
    if (!values.virtualUsers.trim() || !Number.isInteger(virtualUsers) || virtualUsers < 1) {
      setVuError('Virtual users must be a whole number of at least 1.');
      hasError = true;
    }
    if (!values.durationSeconds.trim() || !Number.isInteger(durationSeconds) || durationSeconds < 1) {
      setDurationError('Duration must be a whole number of at least 1 second.');
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        environmentId: values.environmentId || undefined,
        name: trimmedName,
        description: values.description.trim() || undefined,
        targetUrl: trimmedUrl,
        method: values.method,
        headers: rowsToRecord(values.headerRows),
        body: values.bodyText.trim() || undefined,
        virtualUsers,
        rampUpSeconds: Number(values.rampUpSeconds || 0),
        durationSeconds,
        iterations: values.iterations.trim() ? Number(values.iterations) : undefined,
        thresholdResponseTimeMs: values.thresholdResponseTimeMs.trim()
          ? Number(values.thresholdResponseTimeMs)
          : undefined,
        thresholdErrorRatePercent: values.thresholdErrorRatePercent.trim()
          ? Number(values.thresholdErrorRatePercent)
          : undefined,
        thresholdThroughputRps: values.thresholdThroughputRps.trim()
          ? Number(values.thresholdThroughputRps)
          : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save performance test.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'create' ? 'Create Performance Test' : 'Edit Performance Test'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before adding a performance test.
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
                    : 'Used to resolve a relative target URL via its base URL.'
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Method"
                  fullWidth
                  value={values.method}
                  onChange={(e) => setValues((prev) => ({ ...prev, method: e.target.value as PerfHttpMethod }))}
                  sx={{ maxWidth: { sm: 160 } }}
                >
                  {METHOD_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Target URL"
                  required
                  fullWidth
                  placeholder="https://api.example.com/v1/users or /v1/users"
                  value={values.targetUrl}
                  error={Boolean(urlError)}
                  helperText={
                    urlError ??
                    "Relative paths are joined with the selected environment's base URL when run."
                  }
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, targetUrl: e.target.value }));
                    if (urlError) setUrlError(null);
                  }}
                />
              </Stack>

              <HeaderRowsEditor
                rows={values.headerRows}
                onChange={(rows) => setValues((prev) => ({ ...prev, headerRows: rows }))}
              />

              <TextField
                label="Body (optional)"
                fullWidth
                multiline
                minRows={2}
                placeholder="Raw request body sent by every virtual user (ignored for GET/DELETE)"
                value={values.bodyText}
                onChange={(e) => setValues((prev) => ({ ...prev, bodyText: e.target.value }))}
              />

              <Typography variant="subtitle2">Load Profile</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Virtual Users"
                  type="number"
                  required
                  fullWidth
                  value={values.virtualUsers}
                  error={Boolean(vuError)}
                  helperText={vuError ?? '1-50'}
                  slotProps={{ htmlInput: { min: 1, max: 50 } }}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, virtualUsers: e.target.value }));
                    if (vuError) setVuError(null);
                  }}
                />
                <TextField
                  label="Ramp-Up (seconds)"
                  type="number"
                  fullWidth
                  value={values.rampUpSeconds}
                  helperText="0-300"
                  slotProps={{ htmlInput: { min: 0, max: 300 } }}
                  onChange={(e) => setValues((prev) => ({ ...prev, rampUpSeconds: e.target.value }))}
                />
                <TextField
                  label="Duration (seconds)"
                  type="number"
                  required
                  fullWidth
                  value={values.durationSeconds}
                  error={Boolean(durationError)}
                  helperText={durationError ?? '1-60 (capped so a run stays bounded)'}
                  slotProps={{ htmlInput: { min: 1, max: 60 } }}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, durationSeconds: e.target.value }));
                    if (durationError) setDurationError(null);
                  }}
                />
                <TextField
                  label="Iterations (optional)"
                  type="number"
                  fullWidth
                  helperText="Total request cap across all VUs"
                  value={values.iterations}
                  slotProps={{ htmlInput: { min: 1 } }}
                  onChange={(e) => setValues((prev) => ({ ...prev, iterations: e.target.value }))}
                />
              </Stack>

              <Typography variant="subtitle2">Thresholds (optional)</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Max Avg Response Time (ms)"
                  type="number"
                  fullWidth
                  value={values.thresholdResponseTimeMs}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, thresholdResponseTimeMs: e.target.value }))
                  }
                />
                <TextField
                  label="Max Error Rate (%)"
                  type="number"
                  fullWidth
                  value={values.thresholdErrorRatePercent}
                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, thresholdErrorRatePercent: e.target.value }))
                  }
                />
                <TextField
                  label="Min Throughput (req/s)"
                  type="number"
                  fullWidth
                  value={values.thresholdThroughputRps}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, thresholdThroughputRps: e.target.value }))
                  }
                />
              </Stack>
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
