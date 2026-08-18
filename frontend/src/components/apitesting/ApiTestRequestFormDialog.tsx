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
  ApiAuthType,
  ApiHttpMethod,
  ApiTestRequest,
  CreateApiTestRequestPayload,
} from '../../types/apiTesting';
import type { ApiProduct } from '../../types/product';
import type { ApiEnvironment } from '../../types/environment';

const METHOD_OPTIONS: ApiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const AUTH_TYPE_OPTIONS: { value: ApiAuthType; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'BEARER', label: 'Bearer' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'API_KEY', label: 'API Key' },
];

interface KeyValueRow {
  key: string;
  value: string;
}

function emptyRow(): KeyValueRow {
  return { key: '', value: '' };
}

function recordToRows(record: Record<string, string> | null | undefined): KeyValueRow[] {
  const entries = record ? Object.entries(record) : [];
  return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [emptyRow()];
}

function rowsToRecord(rows: KeyValueRow[]): Record<string, string> | undefined {
  const record: Record<string, string> = {};
  rows.forEach((row) => {
    const key = row.key.trim();
    if (key) record[key] = row.value;
  });
  return Object.keys(record).length > 0 ? record : undefined;
}

export interface ApiTestRequestFormValues {
  productId: string;
  environmentId: string;
  name: string;
  method: ApiHttpMethod;
  url: string;
  headerRows: KeyValueRow[];
  queryParamRows: KeyValueRow[];
  bodyText: string;
  authType: ApiAuthType;
  authToken: string;
  authUsername: string;
  authPassword: string;
  authHeaderName: string;
  authValue: string;
  expectedStatus: string;
}

function emptyValues(defaultProductId: string): ApiTestRequestFormValues {
  return {
    productId: defaultProductId,
    environmentId: '',
    name: '',
    method: 'GET',
    url: '',
    headerRows: [emptyRow()],
    queryParamRows: [emptyRow()],
    bodyText: '',
    authType: 'NONE',
    authToken: '',
    authUsername: '',
    authPassword: '',
    authHeaderName: '',
    authValue: '',
    expectedStatus: '',
  };
}

// Builds the form's edit-mode initial values from a full (authConfig-included)
// detail record. The list view deliberately omits `authConfig`, so callers
// must fetch the single-record detail endpoint before opening the form in
// edit mode -- see ApiTestingPage's handleEditClick.
export function apiTestRequestToFormValues(request: ApiTestRequest): ApiTestRequestFormValues {
  return {
    productId: request.productId,
    environmentId: request.environmentId ?? '',
    name: request.name,
    method: request.method,
    url: request.url,
    headerRows: recordToRows(request.headers),
    queryParamRows: recordToRows(request.queryParams),
    bodyText: request.body ?? '',
    authType: request.authType,
    authToken: request.authType === 'BEARER' ? (request.authConfig?.token ?? '') : '',
    authUsername: request.authType === 'BASIC' ? (request.authConfig?.username ?? '') : '',
    authPassword: request.authType === 'BASIC' ? (request.authConfig?.password ?? '') : '',
    authHeaderName: request.authType === 'API_KEY' ? (request.authConfig?.headerName ?? '') : '',
    authValue: request.authType === 'API_KEY' ? (request.authConfig?.value ?? '') : '',
    expectedStatus: request.expectedStatus != null ? String(request.expectedStatus) : '',
  };
}

interface KeyValueRowsEditorProps {
  label: string;
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  addButtonLabel: string;
}

// Mirrors the dynamic add/remove-row UX pattern used by TestCaseFormDialog's
// Steps list, adapted for generic key/value pairs (used for both Headers
// and Query Params below).
function KeyValueRowsEditor({
  label,
  rows,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addButtonLabel,
}: KeyValueRowsEditorProps) {
  const handleRowChange = (index: number, field: keyof KeyValueRow, value: string) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleAddRow = () => {
    onChange([...rows, emptyRow()]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : rows);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Stack spacing={1.5}>
        {rows.map((row, index) => (
          <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <TextField
              label="Key"
              fullWidth
              placeholder={keyPlaceholder}
              value={row.key}
              onChange={(e) => handleRowChange(index, 'key', e.target.value)}
            />
            <TextField
              label="Value"
              fullWidth
              placeholder={valuePlaceholder}
              value={row.value}
              onChange={(e) => handleRowChange(index, 'value', e.target.value)}
            />
            <IconButton
              size="small"
              onClick={() => handleRemoveRow(index)}
              disabled={rows.length === 1}
              sx={{ mt: 1 }}
              aria-label={`Remove ${label.toLowerCase()} row ${index + 1}`}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow} sx={{ mt: 1 }}>
        {addButtonLabel}
      </Button>
    </Box>
  );
}

interface ApiTestRequestFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  products: ApiProduct[];
  environments: ApiEnvironment[];
  initialValues?: ApiTestRequestFormValues;
  onClose: () => void;
  onSubmit: (data: CreateApiTestRequestPayload) => Promise<void>;
}

export function ApiTestRequestFormDialog({
  open,
  mode,
  products,
  environments,
  initialValues,
  onClose,
  onSubmit,
}: ApiTestRequestFormDialogProps) {
  const [values, setValues] = useState<ApiTestRequestFormValues>(emptyValues(''));
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [headerNameError, setHeaderNameError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? emptyValues(products[0]?.id ?? ''));
      setNameError(null);
      setUrlError(null);
      setTokenError(null);
      setUsernameError(null);
      setPasswordError(null);
      setHeaderNameError(null);
      setValueError(null);
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
    const trimmedUrl = values.url.trim();
    let hasError = false;

    if (!trimmedName) {
      setNameError('Name is required.');
      hasError = true;
    }
    if (!trimmedUrl) {
      setUrlError('URL is required.');
      hasError = true;
    }

    let authConfig: Record<string, string> | undefined;
    if (values.authType === 'BEARER') {
      const token = values.authToken.trim();
      if (!token) {
        setTokenError('Token is required.');
        hasError = true;
      } else {
        authConfig = { token };
      }
    } else if (values.authType === 'BASIC') {
      const username = values.authUsername.trim();
      const password = values.authPassword.trim();
      if (!username) {
        setUsernameError('Username is required.');
        hasError = true;
      }
      if (!password) {
        setPasswordError('Password is required.');
        hasError = true;
      }
      if (username && password) {
        authConfig = { username, password };
      }
    } else if (values.authType === 'API_KEY') {
      const headerName = values.authHeaderName.trim();
      const value = values.authValue.trim();
      if (!headerName) {
        setHeaderNameError('Header name is required.');
        hasError = true;
      }
      if (!value) {
        setValueError('Value is required.');
        hasError = true;
      }
      if (headerName && value) {
        authConfig = { headerName, value };
      }
    }

    if (hasError) return;

    const expectedStatusTrimmed = values.expectedStatus.trim();
    const expectedStatus = expectedStatusTrimmed ? Number(expectedStatusTrimmed) : undefined;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        productId: values.productId,
        environmentId: values.environmentId || undefined,
        name: trimmedName,
        method: values.method,
        url: trimmedUrl,
        headers: rowsToRecord(values.headerRows),
        queryParams: rowsToRecord(values.queryParamRows),
        body: values.bodyText.trim() || undefined,
        authType: values.authType,
        authConfig,
        expectedStatus,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save API test request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {mode === 'create' ? 'Create API Test Request' : 'Edit API Test Request'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}

          {noProductsAvailable ? (
            <Alert severity="warning">
              No products exist yet. Create a product before adding an API test request.
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Method"
                  fullWidth
                  value={values.method}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, method: e.target.value as ApiHttpMethod }))
                  }
                  sx={{ maxWidth: { sm: 160 } }}
                >
                  {METHOD_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="URL"
                  required
                  fullWidth
                  placeholder="https://api.example.com/v1/users or /v1/users"
                  value={values.url}
                  error={Boolean(urlError)}
                  helperText={
                    urlError ??
                    "Relative paths (e.g. /v1/users) are joined with the selected environment's base URL at send time."
                  }
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, url: e.target.value }));
                    if (urlError) setUrlError(null);
                  }}
                />
              </Stack>

              <KeyValueRowsEditor
                label="Headers"
                rows={values.headerRows}
                onChange={(rows) => setValues((prev) => ({ ...prev, headerRows: rows }))}
                keyPlaceholder="Header name"
                valuePlaceholder="Header value"
                addButtonLabel="Add Header"
              />

              <KeyValueRowsEditor
                label="Query Params"
                rows={values.queryParamRows}
                onChange={(rows) => setValues((prev) => ({ ...prev, queryParamRows: rows }))}
                keyPlaceholder="Param name"
                valuePlaceholder="Param value"
                addButtonLabel="Add Query Param"
              />

              <TextField
                label="Body (optional)"
                fullWidth
                multiline
                minRows={3}
                placeholder="Raw request body (any content type)"
                value={values.bodyText}
                onChange={(e) => setValues((prev) => ({ ...prev, bodyText: e.target.value }))}
              />

              <TextField
                select
                label="Auth Type"
                fullWidth
                value={values.authType}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, authType: e.target.value as ApiAuthType }))
                }
              >
                {AUTH_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              {values.authType === 'BEARER' && (
                <TextField
                  label="Token"
                  required
                  fullWidth
                  value={values.authToken}
                  error={Boolean(tokenError)}
                  helperText={tokenError ?? ' '}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, authToken: e.target.value }));
                    if (tokenError) setTokenError(null);
                  }}
                />
              )}

              {values.authType === 'BASIC' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Username"
                    required
                    fullWidth
                    value={values.authUsername}
                    error={Boolean(usernameError)}
                    helperText={usernameError ?? ' '}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, authUsername: e.target.value }));
                      if (usernameError) setUsernameError(null);
                    }}
                  />
                  <TextField
                    label="Password"
                    required
                    fullWidth
                    type="password"
                    value={values.authPassword}
                    error={Boolean(passwordError)}
                    helperText={passwordError ?? ' '}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, authPassword: e.target.value }));
                      if (passwordError) setPasswordError(null);
                    }}
                  />
                </Stack>
              )}

              {values.authType === 'API_KEY' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Header Name"
                    required
                    fullWidth
                    placeholder="e.g. X-API-Key"
                    value={values.authHeaderName}
                    error={Boolean(headerNameError)}
                    helperText={headerNameError ?? ' '}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, authHeaderName: e.target.value }));
                      if (headerNameError) setHeaderNameError(null);
                    }}
                  />
                  <TextField
                    label="Value"
                    required
                    fullWidth
                    value={values.authValue}
                    error={Boolean(valueError)}
                    helperText={valueError ?? ' '}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, authValue: e.target.value }));
                      if (valueError) setValueError(null);
                    }}
                  />
                </Stack>
              )}

              <TextField
                label="Expected Status (optional)"
                type="number"
                fullWidth
                placeholder="e.g. 200"
                value={values.expectedStatus}
                helperText="Leave blank to skip the pass/fail assertion."
                onChange={(e) => setValues((prev) => ({ ...prev, expectedStatus: e.target.value }))}
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
