import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
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
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { ImportResultDialog } from '../components/common/ImportResultDialog';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';
import { ProjectFormDialog } from '../components/project/ProjectFormDialog';
import { ProjectDetailDialog } from '../components/project/ProjectDetailDialog';
import { DeleteProjectDialog } from '../components/project/DeleteProjectDialog';
import { ProductFormDialog } from '../components/product/ProductFormDialog';
import { ProductDetailDialog } from '../components/product/ProductDetailDialog';
import {
  createProject,
  deleteProject,
  fetchProjects,
  importProjects,
  updateProject,
} from '../api/projects';
import { createProduct, fetchProducts, updateProduct } from '../api/products';
import { fetchOrganizations } from '../api/organizations';
import { fetchUsers } from '../api/users';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import type {
  ApiProject,
  ApiProjectStatus,
  CreateProjectPayload,
  ProjectStatus,
} from '../types/project';
import type { ApiOrganization } from '../types/organization';
import type {
  ApiProduct,
  ApiProductStatus,
  CreateProductPayload,
  ProductStatus,
} from '../types/product';
import type { ApiUser } from '../types/settings';

const STATUS_LABELS: Record<ApiProjectStatus, ProjectStatus> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

const PRODUCT_STATUS_LABELS: Record<ApiProductStatus, ProductStatus> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

const ALL = 'ALL' as const;

export function ProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[] | null>(null);
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([]);
  // True when fetchOrganizations() came back 403 rather than an empty list --
  // this role can't see the organization list, even though organizations may
  // well exist (the Projects table above gets its org names from a different,
  // permitted endpoint, which is why this can look inconsistent otherwise).
  const [organizationsForbidden, setOrganizationsForbidden] = useState(false);
  // Products are shown nested under their project, so one page covers both.
  const [products, setProducts] = useState<ApiProduct[]>([]);
  // True when fetchProducts() came back 403 (role lacks products:read), as
  // opposed to a project simply having no products.
  const [productsForbidden, setProductsForbidden] = useState(false);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [productFormMode, setProductFormMode] = useState<'create' | 'edit' | null>(null);
  const [productFormProject, setProductFormProject] = useState<ApiProject | null>(null);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiProjectStatus | typeof ALL>(ALL);
  const [organizationFilter, setOrganizationFilter] = useState<string | typeof ALL>(ALL);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [deletingProject, setDeletingProject] = useState<ApiProject | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);

  const loadProjects = () => {
    setError(null);
    return fetchProjects()
      .then((data) => setProjects(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load projects (HTTP ${err.status}).`
            : 'Failed to load projects. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;

    fetchProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load projects (HTTP ${err.status}).`
            : 'Failed to load projects. Is the backend running?',
        );
      });

    fetchOrganizations()
      .then((data) => {
        if (!cancelled) setOrganizations(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // The organization list only feeds the create/edit dropdown and the
        // filter bar, so a failure here doesn't block the projects list
        // itself -- but a 403 (this role lacks organizations:read) is a
        // different situation from a genuinely empty list, and the dialog
        // needs to know which one happened to show an accurate message.
        setOrganizationsForbidden(err instanceof ApiError && err.status === 403);
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProductsForbidden(err instanceof ApiError && err.status === 403);
      });

    fetchUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        // Only feeds the product-owner picker in the product form.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const reloadProducts = () =>
    fetchProducts()
      .then((data) => setProducts(data))
      .catch(() => {
        // Keep the current list; the save itself already succeeded.
      });

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleProductCreate = async (data: CreateProductPayload) => {
    await createProduct(data);
    await Promise.all([loadProjects(), reloadProducts()]);
    setSnackbar({ message: 'Product created.', severity: 'success' });
  };

  const handleProductEdit = async (data: CreateProductPayload) => {
    if (!editingProduct) return;
    await updateProduct(editingProduct.id, data);
    await Promise.all([loadProjects(), reloadProducts()]);
    setSnackbar({ message: 'Product updated.', severity: 'success' });
  };

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (query && !project.name.toLowerCase().includes(query)) return false;
      if (statusFilter !== ALL && project.status !== statusFilter) return false;
      if (organizationFilter !== ALL && project.organizationId !== organizationFilter) return false;
      return true;
    });
  }, [projects, searchQuery, statusFilter, organizationFilter]);

  const isLoading = projects === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== ALL || organizationFilter !== ALL;

  const handleCreateSubmit = async (data: CreateProjectPayload) => {
    await createProject(data);
    await loadProjects();
    setSnackbar({ message: 'Project created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateProjectPayload) => {
    if (!editingProject) return;
    await updateProject(editingProject.id, data);
    await loadProjects();
    setSnackbar({ message: 'Project updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;
    await deleteProject(deletingProject.id);
    await loadProjects();
    setSnackbar({ message: 'Project deleted.', severity: 'success' });
  };

  const handleImport = async (file: File) => {
    try {
      const result = await importProjects(file);
      setImportResult(result);
      await loadProjects();
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Import failed (HTTP ${err.status}).` : 'Import failed.',
        severity: 'error',
      });
    }
  };

  const handleExport = () => {
    exportToCsvWithAudit('Project', 'projects.csv', filteredProjects, [
      { header: 'Project Name', value: (p) => p.name },
      { header: 'Organization', value: (p) => p.organization.name },
      { header: 'Description', value: (p) => p.description },
      { header: 'Status', value: (p) => STATUS_LABELS[p.status] },
      { header: 'Created', value: (p) => new Date(p.createdAt).toLocaleDateString() },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Manage projects and the products inside them. Click the arrow on a project to see its products."
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onImport={handleImport}
              onExport={handleExport}
              importDisabled={false}
              exportDisabled={!projects || projects.length === 0}
              importLabel="Import Projects"
              exportLabel="Export Projects"
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormMode('create')}
            >
              Create Project
            </Button>
          </Stack>
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
            placeholder="Search projects by name…"
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
            onChange={(e) => setStatusFilter(e.target.value as ApiProjectStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {projects && projects.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No projects found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Project
          </Button>
        </Paper>
      )}

      {projects && projects.length > 0 && filteredProjects.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No projects match the current search/filters.'
              : 'No projects found.'}
          </Typography>
        </Paper>
      )}

      {filteredProjects.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }} />
                <TableCell>Project</TableCell>
                <TableCell>Organization</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Products</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProjects.map((project) => {
                const isExpanded = expandedIds.includes(project.id);
                const projectProducts = products.filter((p) => p.projectId === project.id);
                return (
                <Fragment key={project.id}>
                <TableRow hover>
                  <TableCell sx={{ width: 40, px: 0.5 }}>
                    <Tooltip title={isExpanded ? 'Hide products' : 'Show products'}>
                      <IconButton size="small" onClick={() => toggleExpanded(project.id)}>
                        {isExpanded ? (
                          <KeyboardArrowUpIcon fontSize="small" />
                        ) : (
                          <KeyboardArrowDownIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {project.organization.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {project.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[project.status]} />
                  </TableCell>
                  <TableCell align="right">{project._count.products}</TableCell>
                  <TableCell>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => setViewingProjectId(project.id)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingProject(project);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => setDeletingProject(project)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ py: 1.5, pl: 4 }}>
                        <Stack
                          direction="row"
                          sx={{ mb: 1, justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <Typography variant="subtitle2">
                            Products in {project.name} ({projectProducts.length})
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setProductFormProject(project);
                              setProductFormMode('create');
                            }}
                          >
                            Add Product
                          </Button>
                        </Stack>
                        {productsForbidden ? (
                          <Alert severity="info">
                            You don't have permission to view products. Ask a System Administrator to
                            grant your role products:read.
                          </Alert>
                        ) : projectProducts.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No products in this project yet.
                          </Typography>
                        ) : (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Product</TableCell>
                                <TableCell>Key</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Release</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {projectProducts.map((product) => (
                                <TableRow key={product.id} hover>
                                  <TableCell>{product.name}</TableCell>
                                  <TableCell>{product.productKey ?? '—'}</TableCell>
                                  <TableCell>
                                    <StatusChip status={PRODUCT_STATUS_LABELS[product.status]} />
                                  </TableCell>
                                  <TableCell>{product.release}</TableCell>
                                  <TableCell align="right">
                                    <Tooltip title="View">
                                      <IconButton
                                        size="small"
                                        onClick={() => setViewingProductId(product.id)}
                                      >
                                        <VisibilityIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setEditingProduct(product);
                                          setProductFormMode('edit');
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
                </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ProjectFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        organizations={organizations}
        organizationsForbidden={organizationsForbidden}
        initialValues={
          formMode === 'edit' && editingProject
            ? {
                organizationId: editingProject.organizationId,
                businessUnitId: editingProject.businessUnitId ?? '',
                name: editingProject.name,
                description: editingProject.description ?? '',
                status: editingProject.status,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingProject(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <ProductFormDialog
        open={productFormMode !== null}
        mode={productFormMode ?? 'create'}
        organizations={organizations}
        organizationsForbidden={organizationsForbidden}
        projects={projects ?? []}
        users={users}
        initialValues={
          productFormMode === 'edit' && editingProduct
            ? {
                organizationId: editingProduct.organizationId,
                projectId: editingProduct.projectId ?? '',
                name: editingProduct.name,
                productKey: editingProduct.productKey ?? '',
                description: editingProduct.description,
                status: editingProduct.status,
                environment: editingProduct.environment,
                release: editingProduct.release,
                applicationUrl: editingProduct.applicationUrl ?? '',
                repositoryUrl: editingProduct.repositoryUrl ?? '',
                productOwnerId: editingProduct.productOwnerId ?? '',
                currentVersion: editingProduct.currentVersion ?? '',
                testCoverage: String(editingProduct.testCoverage),
                passRate: String(editingProduct.passRate),
                openDefects: String(editingProduct.openDefects),
                releaseReadiness: editingProduct.releaseReadiness,
              }
            : productFormMode === 'create' && productFormProject
              ? {
                  // Pre-select the project (and its organization) the product is
                  // being added from; everything else starts blank.
                  organizationId: productFormProject.organizationId,
                  projectId: productFormProject.id,
                  name: '',
                  productKey: '',
                  description: '',
                  status: 'ACTIVE',
                  environment: '',
                  release: '',
                  applicationUrl: '',
                  repositoryUrl: '',
                  productOwnerId: '',
                  currentVersion: '',
                  testCoverage: '',
                  passRate: '',
                  openDefects: '0',
                  releaseReadiness: 'NOT_READY',
                }
              : undefined
        }
        onClose={() => {
          setProductFormMode(null);
          setEditingProduct(null);
          setProductFormProject(null);
        }}
        onSubmit={productFormMode === 'edit' ? handleProductEdit : handleProductCreate}
      />

      <ProductDetailDialog productId={viewingProductId} onClose={() => setViewingProductId(null)} />

      <ProjectDetailDialog
        projectId={viewingProjectId}
        onClose={() => setViewingProjectId(null)}
      />

      <DeleteProjectDialog
        project={deletingProject}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteConfirm}
      />

      <ImportResultDialog result={importResult} onClose={() => setImportResult(null)} />

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
