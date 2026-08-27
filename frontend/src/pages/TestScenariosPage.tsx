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
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { ImportResultDialog } from '../components/common/ImportResultDialog';
import type { ImportResultSummary } from '../components/common/ImportResultDialog';
import { TestScenarioFormDialog } from '../components/testscenario/TestScenarioFormDialog';
import { TestScenarioDetailDialog } from '../components/testscenario/TestScenarioDetailDialog';
import { DeleteTestScenarioDialog } from '../components/testscenario/DeleteTestScenarioDialog';
import {
  createTestScenario,
  deleteTestScenario,
  fetchTestScenarios,
  importTestScenarios,
  updateTestScenario,
} from '../api/testScenarios';
import { fetchProducts } from '../api/products';
import { fetchRequirements } from '../api/requirements';
import { fetchReleases } from '../api/release';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiTestScenario,
  ApiTestScenarioPriority,
  ApiTestScenarioStatus,
  ApiTestScenarioType,
  CreateTestScenarioPayload,
  TestScenarioPriority,
  TestScenarioStatus,
  TestScenarioType,
} from '../types/testScenario';
import type { ApiProduct } from '../types/product';
import type { ApiRequirement } from '../types/requirement';
import type { ApiRelease } from '../types/release';

const TYPE_LABELS: Record<ApiTestScenarioType, TestScenarioType> = {
  FUNCTIONAL: 'Functional',
  REGRESSION: 'Regression',
  INTEGRATION: 'Integration',
  SMOKE: 'Smoke',
  EDGE_CASE: 'Edge Case',
};

const PRIORITY_LABELS: Record<ApiTestScenarioPriority, TestScenarioPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<ApiTestScenarioStatus, TestScenarioStatus> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
};

const PRIORITY_RANK: Record<ApiTestScenarioPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type SortOption = 'newest' | 'oldest' | 'priority' | 'title';

const ALL = 'ALL' as const;

export function TestScenariosPage() {
  const { currentProduct } = useProductContext();
  const [scenarios, setScenarios] = useState<ApiTestScenario[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [requirements, setRequirements] = useState<ApiRequirement[]>([]);
  const [releases, setReleases] = useState<ApiRelease[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiTestScenarioStatus | typeof ALL>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<ApiTestScenarioPriority | typeof ALL>(ALL);
  const [typeFilter, setTypeFilter] = useState<ApiTestScenarioType | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingScenario, setEditingScenario] = useState<ApiTestScenario | null>(null);
  const [viewingScenarioId, setViewingScenarioId] = useState<string | null>(null);
  const [deletingScenario, setDeletingScenario] = useState<ApiTestScenario | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);

  const loadScenarios = () => {
    setError(null);
    return fetchTestScenarios(currentProduct?.id)
      .then((data) => setScenarios(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load test scenarios (HTTP ${err.status}).`
            : 'Failed to load test scenarios. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setScenarios(null);

    fetchTestScenarios(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setScenarios(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test scenarios (HTTP ${err.status}).`
            : 'Failed to load test scenarios. Is the backend running?',
        );
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        // Only feeds the create/edit dropdown and the filter bar.
      });

    fetchRequirements()
      .then((data) => {
        if (!cancelled) setRequirements(data);
      })
      .catch(() => {
        // Only feeds the optional requirement picker in the form.
      });

    fetchReleases()
      .then((data) => {
        if (!cancelled) setReleases(data);
      })
      .catch(() => {
        // Only feeds the optional Release picker in the create/edit form.
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleScenarios = useMemo(() => {
    if (!scenarios) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = scenarios.filter((scenario) => {
      if (query && !scenario.title.toLowerCase().includes(query)) return false;
      if (statusFilter !== ALL && scenario.status !== statusFilter) return false;
      if (priorityFilter !== ALL && scenario.priority !== priorityFilter) return false;
      if (typeFilter !== ALL && scenario.type !== typeFilter) return false;
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
      case 'priority':
        sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }, [scenarios, searchQuery, statusFilter, priorityFilter, typeFilter, sortBy]);

  const isLoading = scenarios === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== ALL ||
    priorityFilter !== ALL ||
    typeFilter !== ALL;

  // Create/edit/delete apply their result to local state immediately (the
  // API response is already the authoritative, fully-included record), then
  // kick off a background loadScenarios() to reconcile with the server.
  // This matters because loadScenarios() swallows its own fetch failures
  // into `error` state and always resolves -- if we relied on it alone, a
  // transient failure on that second round-trip (e.g. the backend restarting)
  // would leave a real, successfully-created record invisible in the list
  // while still reporting success. Applying the mutation's own response
  // locally means the list is correct even if the reconciliation fetch fails.
  const handleCreateSubmit = async (data: CreateTestScenarioPayload) => {
    const created = await createTestScenario(data);
    setScenarios((prev) => {
      if (currentProduct && created.productId !== currentProduct.id) return prev;
      return prev ? [created, ...prev] : [created];
    });
    setSnackbar({ message: 'Test scenario created.', severity: 'success' });
    void loadScenarios();
  };

  const handleEditSubmit = async (data: CreateTestScenarioPayload) => {
    if (!editingScenario) return;
    const updated = await updateTestScenario(editingScenario.id, data);
    setScenarios((prev) => {
      if (!prev) return prev;
      if (currentProduct && updated.productId !== currentProduct.id) {
        return prev.filter((s) => s.id !== updated.id);
      }
      return prev.map((s) => (s.id === updated.id ? updated : s));
    });
    setSnackbar({ message: 'Test scenario updated.', severity: 'success' });
    void loadScenarios();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingScenario) return;
    await deleteTestScenario(deletingScenario.id);
    setScenarios((prev) => (prev ? prev.filter((s) => s.id !== deletingScenario.id) : prev));
    setSnackbar({ message: 'Test scenario deleted.', severity: 'success' });
    void loadScenarios();
  };

  const handleImport = async (file: File) => {
    if (!currentProduct) {
      setSnackbar({ message: 'Select a product before importing test scenarios.', severity: 'error' });
      return;
    }
    try {
      const result = await importTestScenarios(currentProduct.id, file);
      setImportResult(result);
      await loadScenarios();
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Import failed (HTTP ${err.status}).` : 'Import failed.',
        severity: 'error',
      });
    }
  };

  const handleExport = () => {
    exportToCsvWithAudit('TestScenario', 'test-scenarios.csv', visibleScenarios, [
      { header: 'Title', value: (s) => s.title },
      { header: 'Requirement', value: (s) => s.requirement?.title ?? '' },
      { header: 'Type', value: (s) => TYPE_LABELS[s.type] },
      { header: 'Priority', value: (s) => PRIORITY_LABELS[s.priority] },
      { header: 'Status', value: (s) => STATUS_LABELS[s.status] },
      { header: 'Created', value: (s) => new Date(s.createdAt).toLocaleDateString() },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Test Scenarios"
        subtitle="Define testing conditions that trace back to products and requirements"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onImport={handleImport}
              onExport={handleExport}
              importDisabled={!currentProduct}
              exportDisabled={visibleScenarios.length === 0}
              importLabel="Import Test Scenarios"
              exportLabel="Export Test Scenarios"
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
              Create Test Scenario
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
            placeholder="Search test scenarios by title…"
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
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiTestScenarioStatus | typeof ALL)}
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
            label="Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as ApiTestScenarioPriority | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Priorities</MenuItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ApiTestScenarioType | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 160 } }}
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
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="priority">Priority (High-Low)</MenuItem>
            <MenuItem value="title">Title (A-Z)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {scenarios && scenarios.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No test scenarios found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Test Scenario
          </Button>
        </Paper>
      )}

      {scenarios && scenarios.length > 0 && visibleScenarios.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No test scenarios match the current search/filters.'
              : 'No test scenarios found.'}
          </Typography>
        </Paper>
      )}

      {visibleScenarios.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Requirement</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleScenarios.map((scenario) => (
                <TableRow key={scenario.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap>
                      {scenario.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {scenario.product.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {scenario.requirement?.title ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[scenario.type]}</TableCell>
                  <TableCell>
                    <StatusChip status={PRIORITY_LABELS[scenario.priority]} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[scenario.status]} />
                  </TableCell>
                  <TableCell>{new Date(scenario.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingScenarioId(scenario.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingScenario(scenario);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingScenario(scenario)}>
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

      <TestScenarioFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        requirements={requirements}
        releases={releases}
        currentProductId={currentProduct?.id}
        initialValues={
          formMode === 'edit' && editingScenario
            ? {
                productId: editingScenario.productId,
                requirementId: editingScenario.requirementId ?? '',
                releaseId: editingScenario.releaseId ?? '',
                title: editingScenario.title,
                description: editingScenario.description,
                type: editingScenario.type,
                priority: editingScenario.priority,
                status: editingScenario.status,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingScenario(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <TestScenarioDetailDialog
        testScenarioId={viewingScenarioId}
        onClose={() => setViewingScenarioId(null)}
      />

      <DeleteTestScenarioDialog
        testScenario={deletingScenario}
        onClose={() => setDeletingScenario(null)}
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
