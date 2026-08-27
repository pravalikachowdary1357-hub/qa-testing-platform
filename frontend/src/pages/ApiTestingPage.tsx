import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import {
  ApiTestRequestFormDialog,
  apiTestRequestToFormValues,
} from '../components/apitesting/ApiTestRequestFormDialog';
import type { ApiTestRequestFormValues } from '../components/apitesting/ApiTestRequestFormDialog';
import { ApiTestRequestDetailDialog } from '../components/apitesting/ApiTestRequestDetailDialog';
import { DeleteApiTestRequestDialog } from '../components/apitesting/DeleteApiTestRequestDialog';
import {
  createApiTestRequest,
  deleteApiTestRequest,
  fetchApiTestRequest,
  fetchApiTestRequests,
  updateApiTestRequest,
} from '../api/apiTesting';
import { fetchProducts } from '../api/products';
import { fetchEnvironments } from '../api/environments';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiHttpMethod,
  ApiTestRequestListItem,
  CreateApiTestRequestPayload,
} from '../types/apiTesting';
import type { ApiProduct } from '../types/product';
import type { ApiEnvironment } from '../types/environment';

// HTTP methods are not a status/severity concept, so this color mapping is
// kept local to this page rather than added to the shared StatusChip.
const METHOD_COLORS: Record<ApiHttpMethod, ChipProps['color']> = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  PATCH: 'secondary',
  DELETE: 'error',
};

type SortOption = 'newest' | 'name' | 'method';

const ALL = 'ALL' as const;

function lastResultLabel(item: ApiTestRequestListItem): string | null {
  if (!item.lastExecution) return null;
  if (item.lastExecution.passed === true) return 'Pass';
  if (item.lastExecution.passed === false) return 'Fail';
  return 'No Assertion';
}

export function ApiTestingPage() {
  const { currentProduct } = useProductContext();
  const [requests, setRequests] = useState<ApiTestRequestListItem[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<ApiHttpMethod | typeof ALL>(ALL);
  const [environmentFilter, setEnvironmentFilter] = useState<string | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingFormValues, setEditingFormValues] = useState<ApiTestRequestFormValues | null>(
    null,
  );
  const [viewingRequestId, setViewingRequestId] = useState<string | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<ApiTestRequestListItem | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadRequests = () => {
    setError(null);
    return fetchApiTestRequests(currentProduct?.id)
      .then((data) => setRequests(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load API test requests (HTTP ${err.status}).`
            : 'Failed to load API test requests. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setRequests(null);

    fetchApiTestRequests(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load API test requests (HTTP ${err.status}).`
            : 'Failed to load API test requests. Is the backend running?',
        );
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        // Only feeds the create/edit dropdown and the filter bar.
      });

    fetchEnvironments()
      .then((data) => {
        if (!cancelled) setEnvironments(data);
      })
      .catch(() => {
        // Only feeds the create/edit dropdown and the filter bar.
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleRequests = useMemo(() => {
    if (!requests) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = requests.filter((request) => {
      if (
        query &&
        !request.name.toLowerCase().includes(query) &&
        !request.url.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (methodFilter !== ALL && request.method !== methodFilter) return false;
      if (environmentFilter !== ALL && request.environmentId !== environmentFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'method':
        sorted.sort((a, b) => a.method.localeCompare(b.method));
        break;
    }
    return sorted;
  }, [requests, searchQuery, methodFilter, environmentFilter, sortBy]);

  const isLoading = requests === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || methodFilter !== ALL || environmentFilter !== ALL;

  const handleCreateSubmit = async (data: CreateApiTestRequestPayload) => {
    await createApiTestRequest(data);
    await loadRequests();
    setSnackbar({ message: 'API test request created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateApiTestRequestPayload) => {
    if (!editingRequestId) return;
    await updateApiTestRequest(editingRequestId, data);
    await loadRequests();
    setSnackbar({ message: 'API test request updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRequest) return;
    await deleteApiTestRequest(deletingRequest.id);
    await loadRequests();
    setSnackbar({ message: 'API test request deleted.', severity: 'success' });
  };

  const handleEditClick = async (item: ApiTestRequestListItem) => {
    try {
      // The list view deliberately omits `authConfig`, so the full detail
      // record must be fetched before the form can be prefilled for editing.
      const full = await fetchApiTestRequest(item.id);
      setEditingRequestId(full.id);
      setEditingFormValues(apiTestRequestToFormValues(full));
      setFormMode('edit');
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError
            ? `Failed to load API test request (HTTP ${err.status}).`
            : 'Failed to load API test request for editing.',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <PageHeader
        title="API Testing"
        subtitle="Configure and send real HTTP requests against your environments"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New Request
          </Button>
        }
      />

      {!isLoading && !error && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          useFlexGap
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          <TextField
            size="small"
            placeholder="Search by name or URL…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 240 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as ApiHttpMethod | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 140 } }}
          >
            <MenuItem value={ALL}>All Methods</MenuItem>
            {(Object.keys(METHOD_COLORS) as ApiHttpMethod[]).map((method) => (
              <MenuItem key={method} value={method}>
                {method}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Environment"
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value={ALL}>All Environments</MenuItem>
            {environments.map((environment) => (
              <MenuItem key={environment.id} value={environment.id}>
                {environment.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="name">Name (A-Z)</MenuItem>
            <MenuItem value="method">Method</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {requests && requests.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No API test requests found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New Request
          </Button>
        </Paper>
      )}

      {requests && requests.length > 0 && visibleRequests.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No API test requests match the current search/filters.'
              : 'No API test requests found.'}
          </Typography>
        </Paper>
      )}

      {visibleRequests.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Last Result</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRequests.map((request) => {
                const resultLabel = lastResultLabel(request);
                return (
                  <TableRow key={request.id} hover>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography variant="body2" noWrap>
                        {request.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={request.method}
                        color={METHOD_COLORS[request.method]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {request.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {resultLabel ? (
                        <StatusChip status={resultLabel} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => setViewingRequestId(request.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditClick(request)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeletingRequest(request)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ApiTestRequestFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        environments={environments}
        currentProductId={currentProduct?.id}
        initialValues={formMode === 'edit' ? (editingFormValues ?? undefined) : undefined}
        onClose={() => {
          setFormMode(null);
          setEditingRequestId(null);
          setEditingFormValues(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <ApiTestRequestDetailDialog
        apiTestRequestId={viewingRequestId}
        onClose={() => setViewingRequestId(null)}
      />

      <DeleteApiTestRequestDialog
        apiTestRequest={deletingRequest}
        onClose={() => setDeletingRequest(null)}
        onConfirm={handleDeleteConfirm}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
