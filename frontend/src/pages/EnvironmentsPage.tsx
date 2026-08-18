import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { EnvironmentFormDialog } from '../components/environment/EnvironmentFormDialog';
import { EnvironmentDetailDialog } from '../components/environment/EnvironmentDetailDialog';
import { DeleteEnvironmentDialog } from '../components/environment/DeleteEnvironmentDialog';
import {
  createEnvironment,
  deleteEnvironment,
  fetchEnvironments,
  updateEnvironment,
} from '../api/environments';
import { fetchProducts } from '../api/products';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiEnvironment,
  ApiEnvironmentStatus,
  ApiEnvironmentType,
  CreateEnvironmentPayload,
  EnvironmentStatus,
  EnvironmentType,
} from '../types/environment';
import type { ApiProduct } from '../types/product';

const TYPE_LABELS: Record<ApiEnvironmentType, EnvironmentType> = {
  DEVELOPMENT: 'Development',
  QA: 'QA',
  STAGING: 'Staging',
  UAT: 'UAT',
  PRODUCTION: 'Production',
};

const STATUS_LABELS: Record<ApiEnvironmentStatus, EnvironmentStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  MAINTENANCE: 'Maintenance',
};

type SortOption = 'newest' | 'oldest' | 'name';

const ALL = 'ALL' as const;

export function EnvironmentsPage() {
  const { currentProduct } = useProductContext();
  const [environments, setEnvironments] = useState<ApiEnvironment[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ApiEnvironmentType | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = useState<ApiEnvironmentStatus | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingEnvironment, setEditingEnvironment] = useState<ApiEnvironment | null>(null);
  const [viewingEnvironmentId, setViewingEnvironmentId] = useState<string | null>(null);
  const [deletingEnvironment, setDeletingEnvironment] = useState<ApiEnvironment | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadEnvironments = () => {
    setError(null);
    return fetchEnvironments(currentProduct?.id)
      .then((data) => setEnvironments(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load environments (HTTP ${err.status}).`
            : 'Failed to load environments. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setEnvironments(null);

    fetchEnvironments(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setEnvironments(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load environments (HTTP ${err.status}).`
            : 'Failed to load environments. Is the backend running?',
        );
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        // Only feeds the create/edit dropdown and the filter bar.
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleEnvironments = useMemo(() => {
    if (!environments) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = environments.filter((environment) => {
      if (query && !environment.name.toLowerCase().includes(query)) return false;
      if (typeFilter !== ALL && environment.type !== typeFilter) return false;
      if (statusFilter !== ALL && environment.status !== statusFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [environments, searchQuery, typeFilter, statusFilter, sortBy]);

  const isLoading = environments === null && !error;
  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== ALL || statusFilter !== ALL;

  const handleCreateSubmit = async (data: CreateEnvironmentPayload) => {
    await createEnvironment(data);
    await loadEnvironments();
    setSnackbar({ message: 'Environment created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateEnvironmentPayload) => {
    if (!editingEnvironment) return;
    await updateEnvironment(editingEnvironment.id, data);
    await loadEnvironments();
    setSnackbar({ message: 'Environment updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEnvironment) return;
    await deleteEnvironment(deletingEnvironment.id);
    await loadEnvironments();
    setSnackbar({ message: 'Environment deleted.', severity: 'success' });
  };

  return (
    <>
      <PageHeader
        title="Environments"
        subtitle="Manage the environments test executions run against"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Environment
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
            placeholder="Search environments by name…"
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
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ApiEnvironmentType | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Types</MenuItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiEnvironmentStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
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
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="name">Name (A-Z)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {environments && environments.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No environments found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Environment
          </Button>
        </Paper>
      )}

      {environments && environments.length > 0 && visibleEnvironments.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No environments match the current search/filters.'
              : 'No environments found.'}
          </Typography>
        </Paper>
      )}

      {visibleEnvironments.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Base URL</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleEnvironments.map((environment) => (
                <TableRow key={environment.id} hover>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="body2" noWrap>
                      {environment.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {environment.product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[environment.type]}</TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[environment.status]} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {environment.baseUrl ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{new Date(environment.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingEnvironmentId(environment.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingEnvironment(environment);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingEnvironment(environment)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <EnvironmentFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        initialValues={
          formMode === 'edit' && editingEnvironment
            ? {
                productId: editingEnvironment.productId,
                name: editingEnvironment.name,
                type: editingEnvironment.type,
                status: editingEnvironment.status,
                baseUrl: editingEnvironment.baseUrl ?? '',
                description: editingEnvironment.description ?? '',
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingEnvironment(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <EnvironmentDetailDialog
        environmentId={viewingEnvironmentId}
        onClose={() => setViewingEnvironmentId(null)}
      />

      <DeleteEnvironmentDialog
        environment={deletingEnvironment}
        onClose={() => setDeletingEnvironment(null)}
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
