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
import GavelIcon from '@mui/icons-material/Gavel';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { UatCycleFormDialog, uatCycleToFormValues } from '../components/uat/UatCycleFormDialog';
import type { UatCycleFormValues } from '../components/uat/UatCycleFormDialog';
import { UatCycleDetailDialog } from '../components/uat/UatCycleDetailDialog';
import { DeleteUatCycleDialog } from '../components/uat/DeleteUatCycleDialog';
import { SignOffUatCycleDialog } from '../components/uat/SignOffUatCycleDialog';
import {
  createUatCycle,
  deleteUatCycle,
  fetchUatCycle,
  fetchUatCycles,
  signOffUatCycle,
  updateUatCycle,
} from '../api/uat';
import { fetchProducts } from '../api/products';
import { fetchEnvironments } from '../api/environments';
import { fetchDefects } from '../api/defects';
import { fetchRequirements } from '../api/requirements';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import { CYCLE_STATUS_LABELS } from '../types/uat';
import type {
  CreateUatCyclePayload,
  SignOffUatCyclePayload,
  UatCycleListItem,
  UatCycleStatus,
} from '../types/uat';
import type { ApiProduct } from '../types/product';
import type { ApiEnvironment } from '../types/environment';
import type { ApiDefect } from '../types/defect';
import type { ApiRequirement } from '../types/requirement';

type SortOption = 'newest' | 'name';

const ALL = 'ALL' as const;

const STATUS_OPTIONS: UatCycleStatus[] = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'APPROVED',
  'REJECTED',
];

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 100, flex: 1, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

export function UatPage() {
  const { currentProduct } = useProductContext();
  const [cycles, setCycles] = useState<UatCycleListItem[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [defects, setDefects] = useState<ApiDefect[]>([]);
  const [requirements, setRequirements] = useState<ApiRequirement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UatCycleStatus | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editingFormValues, setEditingFormValues] = useState<UatCycleFormValues | null>(null);
  const [viewingCycleId, setViewingCycleId] = useState<string | null>(null);
  const [deletingCycle, setDeletingCycle] = useState<UatCycleListItem | null>(null);
  const [signingOffCycle, setSigningOffCycle] = useState<UatCycleListItem | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadCycles = () => {
    setError(null);
    return fetchUatCycles(currentProduct?.id)
      .then((data) => setCycles(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load UAT cycles (HTTP ${err.status}).`
            : 'Failed to load UAT cycles. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setCycles(null);

    fetchUatCycles(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setCycles(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load UAT cycles (HTTP ${err.status}).`
            : 'Failed to load UAT cycles. Is the backend running?',
        );
      });

    fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .catch(() => {});
    fetchEnvironments()
      .then((data) => {
        if (!cancelled) setEnvironments(data);
      })
      .catch(() => {});
    fetchDefects()
      .then((data) => {
        if (!cancelled) setDefects(data);
      })
      .catch(() => {});
    fetchRequirements()
      .then((data) => {
        if (!cancelled) setRequirements(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const overallSummary = useMemo(() => {
    const totals = { pass: 0, fail: 0, blocked: 0, notRun: 0, notApplicable: 0 };
    (cycles ?? []).forEach((cycle) => {
      totals.pass += cycle.summary.pass;
      totals.fail += cycle.summary.fail;
      totals.blocked += cycle.summary.blocked;
      totals.notRun += cycle.summary.notRun;
      totals.notApplicable += cycle.summary.notApplicable;
    });
    return totals;
  }, [cycles]);

  const visibleCycles = useMemo(() => {
    if (!cycles) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = cycles.filter((cycle) => {
      if (query && !cycle.name.toLowerCase().includes(query)) return false;
      if (statusFilter !== ALL && cycle.status !== statusFilter) return false;
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
  }, [cycles, searchQuery, statusFilter, sortBy]);

  const isLoading = cycles === null && !error;
  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== ALL;

  const handleCreateSubmit = async (data: CreateUatCyclePayload) => {
    await createUatCycle(data);
    await loadCycles();
    setSnackbar({ message: 'UAT cycle created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateUatCyclePayload & { status?: UatCycleStatus }) => {
    if (!editingCycleId) return;
    const { status, ...rest } = data;
    await updateUatCycle(editingCycleId, {
      ...rest,
      status: status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | undefined,
    });
    await loadCycles();
    setSnackbar({ message: 'UAT cycle updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCycle) return;
    await deleteUatCycle(deletingCycle.id);
    await loadCycles();
    setSnackbar({ message: 'UAT cycle deleted.', severity: 'success' });
  };

  const handleSignOffConfirm = async (data: SignOffUatCyclePayload) => {
    if (!signingOffCycle) return;
    await signOffUatCycle(signingOffCycle.id, data);
    await loadCycles();
    setSnackbar({
      message: `UAT cycle ${data.decision === 'APPROVED' ? 'approved' : 'rejected'}.`,
      severity: 'success',
    });
  };

  const handleEditClick = async (item: UatCycleListItem) => {
    try {
      const full = await fetchUatCycle(item.id);
      setEditingCycleId(full.id);
      setEditingFormValues(uatCycleToFormValues(full));
      setFormMode('edit');
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError
            ? `Failed to load UAT cycle (HTTP ${err.status}).`
            : 'Failed to load UAT cycle for editing.',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <PageHeader
        title="UAT"
        subtitle="Plan user acceptance test cycles, execute test cases, and record sign-off"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New UAT Cycle
          </Button>
        }
      />

      {cycles && cycles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Test Case Results (this product's cycles)
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            <SummaryCard label="Pass" value={overallSummary.pass} />
            <SummaryCard label="Fail" value={overallSummary.fail} />
            <SummaryCard label="Blocked" value={overallSummary.blocked} />
            <SummaryCard label="Not Run" value={overallSummary.notRun} />
            <SummaryCard label="Not Applicable" value={overallSummary.notApplicable} />
          </Stack>
        </Box>
      )}

      {!isLoading && !error && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          useFlexGap
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          <TextField
            size="small"
            placeholder="Search by cycle name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 220 } }}
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
            onChange={(e) => setStatusFilter(e.target.value as UatCycleStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {CYCLE_STATUS_LABELS[status]}
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

      {cycles && cycles.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No UAT cycles found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New UAT Cycle
          </Button>
        </Paper>
      )}

      {cycles && cycles.length > 0 && visibleCycles.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No UAT cycles match the current search/filters.'
              : 'No UAT cycles found.'}
          </Typography>
        </Paper>
      )}

      {visibleCycles.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Test Cases</TableCell>
                <TableCell>Pass / Fail / Blocked</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleCycles.map((cycle) => (
                <TableRow key={cycle.id} hover>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {cycle.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{cycle.product.name}</TableCell>
                  <TableCell>
                    <StatusChip status={CYCLE_STATUS_LABELS[cycle.status]} />
                  </TableCell>
                  <TableCell>{cycle.testCaseCount}</TableCell>
                  <TableCell>
                    {cycle.summary.pass} / {cycle.summary.fail} / {cycle.summary.blocked}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingCycleId(cycle.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEditClick(cycle)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sign Off">
                      <IconButton size="small" onClick={() => setSigningOffCycle(cycle)}>
                        <GavelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingCycle(cycle)}>
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

      <UatCycleFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        currentProductId={currentProduct?.id}
        initialValues={formMode === 'edit' ? (editingFormValues ?? undefined) : undefined}
        onClose={() => {
          setFormMode(null);
          setEditingCycleId(null);
          setEditingFormValues(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <UatCycleDetailDialog
        cycleId={viewingCycleId}
        environments={environments}
        defects={defects}
        requirements={requirements}
        onClose={() => {
          setViewingCycleId(null);
          void loadCycles();
        }}
        onMutate={() => void loadCycles()}
      />

      <DeleteUatCycleDialog
        cycle={deletingCycle}
        onClose={() => setDeletingCycle(null)}
        onConfirm={handleDeleteConfirm}
      />

      <SignOffUatCycleDialog
        cycle={signingOffCycle}
        onClose={() => setSigningOffCycle(null)}
        onConfirm={handleSignOffConfirm}
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
