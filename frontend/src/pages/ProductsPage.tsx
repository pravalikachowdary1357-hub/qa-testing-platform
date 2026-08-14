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
import { ProductFormDialog } from '../components/product/ProductFormDialog';
import { ProductDetailDialog } from '../components/product/ProductDetailDialog';
import { DeleteProductDialog } from '../components/product/DeleteProductDialog';
import { createProduct, deleteProduct, fetchProducts, updateProduct } from '../api/products';
import { fetchOrganizations } from '../api/organizations';
import { ApiError } from '../api/client';
import type {
  ApiProduct,
  ApiProductStatus,
  ApiReleaseReadiness,
  CreateProductPayload,
  ProductStatus,
  ReleaseReadiness,
} from '../types/product';
import type { ApiOrganization } from '../types/organization';

const STATUS_LABELS: Record<ApiProductStatus, ProductStatus> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

const READINESS_LABELS: Record<ApiReleaseReadiness, ReleaseReadiness> = {
  READY: 'Ready',
  CONDITIONAL: 'Conditional',
  NOT_READY: 'Not Ready',
};

type SortOption = 'newest' | 'oldest' | 'name' | 'testCoverage' | 'passRate';

const ALL = 'ALL' as const;

export function ProductsPage() {
  const [products, setProducts] = useState<ApiProduct[] | null>(null);
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiProductStatus | typeof ALL>(ALL);
  const [readinessFilter, setReadinessFilter] = useState<ApiReleaseReadiness | typeof ALL>(ALL);
  const [organizationFilter, setOrganizationFilter] = useState<string | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ApiProduct | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadProducts = () => {
    setError(null);
    return fetchProducts()
      .then((data) => setProducts(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load products (HTTP ${err.status}).`
            : 'Failed to load products. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load products (HTTP ${err.status}).`
            : 'Failed to load products. Is the backend running?',
        );
      });

    fetchOrganizations()
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch(() => {
        // The organization list only feeds the create/edit dropdown and the
        // filter bar; a failure here surfaces naturally as "no organizations
        // available" rather than blocking the products list itself.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProducts = useMemo(() => {
    if (!products) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = products.filter((product) => {
      if (query && !product.name.toLowerCase().includes(query)) return false;
      if (statusFilter !== ALL && product.status !== statusFilter) return false;
      if (readinessFilter !== ALL && product.releaseReadiness !== readinessFilter) return false;
      if (organizationFilter !== ALL && product.organizationId !== organizationFilter) return false;
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
      case 'testCoverage':
        sorted.sort((a, b) => b.testCoverage - a.testCoverage);
        break;
      case 'passRate':
        sorted.sort((a, b) => b.passRate - a.passRate);
        break;
    }
    return sorted;
  }, [products, searchQuery, statusFilter, readinessFilter, organizationFilter, sortBy]);

  const isLoading = products === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== ALL ||
    readinessFilter !== ALL ||
    organizationFilter !== ALL;

  const handleCreateSubmit = async (data: CreateProductPayload) => {
    await createProduct(data);
    await loadProducts();
    setSnackbar({ message: 'Product created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateProductPayload) => {
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, data);
    await loadProducts();
    setSnackbar({ message: 'Product updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    await deleteProduct(deletingProduct.id);
    await loadProducts();
    setSnackbar({ message: 'Product deleted.', severity: 'success' });
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Manage the products tracked in this workspace"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Product
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
            placeholder="Search products by name…"
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
            label="Organization"
            value={organizationFilter}
            onChange={(e) => setOrganizationFilter(e.target.value)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value={ALL}>All Organizations</MenuItem>
            {organizations.map((organization) => (
              <MenuItem key={organization.id} value={organization.id}>
                {organization.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiProductStatus | typeof ALL)}
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
            label="Readiness"
            value={readinessFilter}
            onChange={(e) => setReadinessFilter(e.target.value as ApiReleaseReadiness | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Readiness</MenuItem>
            {Object.entries(READINESS_LABELS).map(([value, label]) => (
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
            <MenuItem value="testCoverage">Test Coverage (High-Low)</MenuItem>
            <MenuItem value="passRate">Pass Rate (High-Low)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {products && products.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No products found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Product
          </Button>
        </Paper>
      )}

      {products && products.length > 0 && visibleProducts.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No products match the current search/filters.'
              : 'No products found.'}
          </Typography>
        </Paper>
      )}

      {visibleProducts.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>Release</TableCell>
                <TableCell align="right">Test Coverage</TableCell>
                <TableCell align="right">Pass Rate</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleProducts.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap>
                      {product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {product.organization.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[product.status]} />
                  </TableCell>
                  <TableCell>{product.environment}</TableCell>
                  <TableCell>{product.release}</TableCell>
                  <TableCell align="right">{product.testCoverage}%</TableCell>
                  <TableCell align="right">{product.passRate}%</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingProductId(product.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingProduct(product);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingProduct(product)}>
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

      <ProductFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        organizations={organizations}
        initialValues={
          formMode === 'edit' && editingProduct
            ? {
                organizationId: editingProduct.organizationId,
                name: editingProduct.name,
                description: editingProduct.description,
                status: editingProduct.status,
                environment: editingProduct.environment,
                release: editingProduct.release,
                testCoverage: String(editingProduct.testCoverage),
                passRate: String(editingProduct.passRate),
                openDefects: String(editingProduct.openDefects),
                releaseReadiness: editingProduct.releaseReadiness,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingProduct(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <ProductDetailDialog productId={viewingProductId} onClose={() => setViewingProductId(null)} />

      <DeleteProductDialog
        product={deletingProduct}
        onClose={() => setDeletingProduct(null)}
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
