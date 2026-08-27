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
import { TestScenarioFormDialog } from '../components/testscenario/TestScenarioFormDialog';
import { TestScenarioDetailDialog } from '../components/testscenario/TestScenarioDetailDialog';
import { DeleteTestScenarioDialog } from '../components/testscenario/DeleteTestScenarioDialog';
import {
  createTestScenario,
  deleteTestScenario,
  fetchTestScenarios,
  updateTestScenario,
} from '../api/testScenarios';
import { fetchProducts } from '../api/products';
import { fetchRequirements } from '../api/requirements';
import { ApiError } from '../api/client';
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

  const handleCreateSubmit = async (data: CreateTestScenarioPayload) => {
    await createTestScenario(data);
    await loadScenarios();
    setSnackbar({ message: 'Test scenario created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateTestScenarioPayload) => {
    if (!editingScenario) return;
    await updateTestScenario(editingScenario.id, data);
    await loadScenarios();
    setSnackbar({ message: 'Test scenario updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingScenario) return;
    await deleteTestScenario(deletingScenario.id);
    await loadScenarios();
    setSnackbar({ message: 'Test scenario deleted.', severity: 'success' });
  };

  return (
    <>
      <PageHeader
        title="Test Scenarios"
        subtitle="Define testing conditions that trace back to products and requirements"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Test Scenario
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
        currentProductId={currentProduct?.id}
        initialValues={
          formMode === 'edit' && editingScenario
            ? {
                productId: editingScenario.productId,
                requirementId: editingScenario.requirementId ?? '',
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
