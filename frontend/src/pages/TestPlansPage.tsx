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
import { TestPlanFormDialog } from '../components/testplan/TestPlanFormDialog';
import { TestPlanDetailDialog } from '../components/testplan/TestPlanDetailDialog';
import { DeleteTestPlanDialog } from '../components/testplan/DeleteTestPlanDialog';
import {
  createTestPlan,
  deleteTestPlan,
  fetchTestPlans,
  updateTestPlan,
} from '../api/testPlans';
import { fetchProducts } from '../api/products';
import { fetchRequirements } from '../api/requirements';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiTestPlan,
  ApiTestPlanPriority,
  ApiTestPlanStatus,
  CreateTestPlanPayload,
  TestPlanPriority,
  TestPlanStatus,
} from '../types/testPlan';
import type { ApiProduct } from '../types/product';
import type { ApiRequirement } from '../types/requirement';

const STATUS_LABELS: Record<ApiTestPlanStatus, TestPlanStatus> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const PRIORITY_LABELS: Record<ApiTestPlanPriority, TestPlanPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_RANK: Record<ApiTestPlanPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type SortOption = 'newest' | 'oldest' | 'priority' | 'name';

const ALL = 'ALL' as const;

function formatDateRange(start: string | null, end: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString();
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return '—';
}

export function TestPlansPage() {
  const { currentProduct } = useProductContext();
  const [testPlans, setTestPlans] = useState<ApiTestPlan[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [requirements, setRequirements] = useState<ApiRequirement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiTestPlanStatus | typeof ALL>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<ApiTestPlanPriority | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingTestPlan, setEditingTestPlan] = useState<ApiTestPlan | null>(null);
  const [viewingTestPlanId, setViewingTestPlanId] = useState<string | null>(null);
  const [deletingTestPlan, setDeletingTestPlan] = useState<ApiTestPlan | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadTestPlans = () => {
    setError(null);
    return fetchTestPlans(currentProduct?.id)
      .then((data) => setTestPlans(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load test plans (HTTP ${err.status}).`
            : 'Failed to load test plans. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setTestPlans(null);

    fetchTestPlans(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestPlans(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test plans (HTTP ${err.status}).`
            : 'Failed to load test plans. Is the backend running?',
        );
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {
        // The product list only feeds the create/edit dropdown and the
        // filter bar; a failure here surfaces naturally as "no products
        // available" rather than blocking the test plans list itself.
      });

    fetchRequirements()
      .then((data) => {
        if (!cancelled) setRequirements(data);
      })
      .catch(() => {
        // Same reasoning as products: only feeds the requirement picker.
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleTestPlans = useMemo(() => {
    if (!testPlans) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = testPlans.filter((plan) => {
      if (query && !plan.name.toLowerCase().includes(query)) return false;
      if (statusFilter !== ALL && plan.status !== statusFilter) return false;
      if (priorityFilter !== ALL && plan.priority !== priorityFilter) return false;
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
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [testPlans, searchQuery, statusFilter, priorityFilter, sortBy]);

  const isLoading = testPlans === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== ALL || priorityFilter !== ALL;

  const handleCreateSubmit = async (data: CreateTestPlanPayload) => {
    await createTestPlan(data);
    await loadTestPlans();
    setSnackbar({ message: 'Test plan created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateTestPlanPayload) => {
    if (!editingTestPlan) return;
    await updateTestPlan(editingTestPlan.id, data);
    await loadTestPlans();
    setSnackbar({ message: 'Test plan updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTestPlan) return;
    await deleteTestPlan(deletingTestPlan.id);
    await loadTestPlans();
    setSnackbar({ message: 'Test plan deleted.', severity: 'success' });
  };

  return (
    <>
      <PageHeader
        title="Test Planning"
        subtitle="Plan and organize test coverage across products and requirements"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Test Plan
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
            placeholder="Search test plans by name…"
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
            onChange={(e) => setStatusFilter(e.target.value as ApiTestPlanStatus | typeof ALL)}
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
            onChange={(e) => setPriorityFilter(e.target.value as ApiTestPlanPriority | typeof ALL)}
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
            label="Sort by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="priority">Priority (High-Low)</MenuItem>
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

      {testPlans && testPlans.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No test plans found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Test Plan
          </Button>
        </Paper>
      )}

      {testPlans && testPlans.length > 0 && visibleTestPlans.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No test plans match the current search/filters.'
              : 'No test plans found.'}
          </Typography>
        </Paper>
      )}

      {visibleTestPlans.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Timeline</TableCell>
                <TableCell>Requirements</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTestPlans.map((plan) => (
                <TableRow key={plan.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap>
                      {plan.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {plan.product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{plan.owner}</TableCell>
                  <TableCell>
                    <StatusChip status={PRIORITY_LABELS[plan.priority]} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[plan.status]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatDateRange(plan.startDate, plan.endDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {plan.requirements.length === 0
                        ? '—'
                        : `${plan.requirements.length} linked`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingTestPlanId(plan.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingTestPlan(plan);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingTestPlan(plan)}>
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

      <TestPlanFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        requirements={requirements}
        initialValues={
          formMode === 'edit' && editingTestPlan
            ? {
                productId: editingTestPlan.productId,
                name: editingTestPlan.name,
                description: editingTestPlan.description,
                status: editingTestPlan.status,
                priority: editingTestPlan.priority,
                owner: editingTestPlan.owner,
                startDate: editingTestPlan.startDate ? editingTestPlan.startDate.slice(0, 10) : '',
                endDate: editingTestPlan.endDate ? editingTestPlan.endDate.slice(0, 10) : '',
                requirementIds: editingTestPlan.requirements.map((r) => r.id),
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingTestPlan(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <TestPlanDetailDialog
        testPlanId={viewingTestPlanId}
        onClose={() => setViewingTestPlanId(null)}
      />

      <DeleteTestPlanDialog
        testPlan={deletingTestPlan}
        onClose={() => setDeletingTestPlan(null)}
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
