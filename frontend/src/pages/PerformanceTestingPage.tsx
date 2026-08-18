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
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import {
  PerformanceTestFormDialog,
  performanceTestToFormValues,
} from '../components/performance/PerformanceTestFormDialog';
import type { PerformanceTestFormValues } from '../components/performance/PerformanceTestFormDialog';
import { PerformanceTestDetailDialog } from '../components/performance/PerformanceTestDetailDialog';
import { DeletePerformanceTestDialog } from '../components/performance/DeletePerformanceTestDialog';
import {
  createPerformanceTest,
  deletePerformanceTest,
  fetchPerformanceTest,
  fetchPerformanceTests,
  updatePerformanceTest,
} from '../api/performanceTesting';
import { fetchProducts } from '../api/products';
import { fetchEnvironments } from '../api/environments';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import { RUN_STATUS_LABELS } from '../types/performanceTesting';
import type {
  CreatePerformanceTestPayload,
  PerformanceRunStatus,
  PerformanceTestListItem,
} from '../types/performanceTesting';
import type { ApiProduct } from '../types/product';
import type { ApiEnvironment } from '../types/environment';

type SortOption = 'newest' | 'name';

const ALL = 'ALL' as const;

const STATUS_OPTIONS: PerformanceRunStatus[] = ['QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'STOPPED'];

export function PerformanceTestingPage() {
  const { currentProduct } = useProductContext();
  const [tests, setTests] = useState<PerformanceTestListItem[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PerformanceRunStatus | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingFormValues, setEditingFormValues] = useState<PerformanceTestFormValues | null>(null);
  const [viewingTestId, setViewingTestId] = useState<string | null>(null);
  const [deletingTest, setDeletingTest] = useState<PerformanceTestListItem | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadTests = () => {
    setError(null);
    return fetchPerformanceTests(currentProduct?.id)
      .then((data) => setTests(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load performance tests (HTTP ${err.status}).`
            : 'Failed to load performance tests. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setTests(null);

    fetchPerformanceTests(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTests(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load performance tests (HTTP ${err.status}).`
            : 'Failed to load performance tests. Is the backend running?',
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
        // Only feeds the create/edit dropdown.
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleTests = useMemo(() => {
    if (!tests) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = tests.filter((test) => {
      if (
        query &&
        !test.name.toLowerCase().includes(query) &&
        !test.targetUrl.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (statusFilter !== ALL && test.lastRunStatus !== statusFilter) return false;
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
    }
    return sorted;
  }, [tests, searchQuery, statusFilter, sortBy]);

  const isLoading = tests === null && !error;
  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== ALL;

  const handleCreateSubmit = async (data: CreatePerformanceTestPayload) => {
    await createPerformanceTest(data);
    await loadTests();
    setSnackbar({ message: 'Performance test created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreatePerformanceTestPayload) => {
    if (!editingTestId) return;
    await updatePerformanceTest(editingTestId, data);
    await loadTests();
    setSnackbar({ message: 'Performance test updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTest) return;
    await deletePerformanceTest(deletingTest.id);
    await loadTests();
    setSnackbar({ message: 'Performance test deleted.', severity: 'success' });
  };

  const handleEditClick = async (item: PerformanceTestListItem) => {
    try {
      const full = await fetchPerformanceTest(item.id);
      setEditingTestId(full.id);
      setEditingFormValues(performanceTestToFormValues(full));
      setFormMode('edit');
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError
            ? `Failed to load performance test (HTTP ${err.status}).`
            : 'Failed to load performance test for editing.',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Performance Testing"
        subtitle="Configure and run real load tests against your environments"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New Performance Test
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
            placeholder="Search by name or target URL…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 260 } }}
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
            label="Last Run Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PerformanceRunStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {RUN_STATUS_LABELS[status]}
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
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {tests && tests.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No performance tests found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New Performance Test
          </Button>
        </Paper>
      )}

      {tests && tests.length > 0 && visibleTests.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No performance tests match the current search/filters.'
              : 'No performance tests found.'}
          </Typography>
        </Paper>
      )}

      {visibleTests.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Virtual Users</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTests.map((test) => (
                <TableRow key={test.id} hover>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {test.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Chip label={test.method} size="small" />
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {test.targetUrl}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{test.virtualUsers}</TableCell>
                  <TableCell>{test.durationSeconds}s</TableCell>
                  <TableCell>
                    {test.lastRunStatus ? (
                      <StatusChip status={RUN_STATUS_LABELS[test.lastRunStatus]} />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingTestId(test.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEditClick(test)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingTest(test)}>
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

      <PerformanceTestFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        environments={environments}
        initialValues={formMode === 'edit' ? (editingFormValues ?? undefined) : undefined}
        onClose={() => {
          setFormMode(null);
          setEditingTestId(null);
          setEditingFormValues(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <PerformanceTestDetailDialog
        performanceTestId={viewingTestId}
        onClose={() => {
          setViewingTestId(null);
          void loadTests();
        }}
      />

      <DeletePerformanceTestDialog
        performanceTest={deletingTest}
        onClose={() => setDeletingTest(null)}
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
