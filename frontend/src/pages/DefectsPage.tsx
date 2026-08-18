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
import { DefectFormDialog } from '../components/defect/DefectFormDialog';
import { DefectDetailDialog } from '../components/defect/DefectDetailDialog';
import { DeleteDefectDialog } from '../components/defect/DeleteDefectDialog';
import { createDefect, deleteDefect, fetchDefects, updateDefect } from '../api/defects';
import { fetchProducts } from '../api/products';
import { fetchEnvironments } from '../api/environments';
import { fetchTestCases } from '../api/testCases';
import { fetchTestScenarios } from '../api/testScenarios';
import { fetchTestExecutions } from '../api/testExecutions';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiDefect,
  ApiDefectPriority,
  ApiDefectSeverity,
  ApiDefectStatus,
  CreateDefectPayload,
  DefectPriority,
  DefectSeverity,
  DefectStatus,
} from '../types/defect';
import type { ApiProduct } from '../types/product';
import type { ApiEnvironment } from '../types/environment';
import type { ApiTestCase } from '../types/testCase';
import type { ApiTestScenario } from '../types/testScenario';
import type { ApiTestExecution } from '../types/testExecution';

const SEVERITY_LABELS: Record<ApiDefectSeverity, DefectSeverity> = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
  TRIVIAL: 'Trivial',
};

const PRIORITY_LABELS: Record<ApiDefectPriority, DefectPriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<ApiDefectStatus, DefectStatus> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
};

type SortOption = 'newest' | 'oldest' | 'severity' | 'status';

const SEVERITY_RANK: Record<ApiDefectSeverity, number> = {
  CRITICAL: 0,
  MAJOR: 1,
  MINOR: 2,
  TRIVIAL: 3,
};

const STATUS_RANK: Record<ApiDefectStatus, number> = {
  OPEN: 0,
  REOPENED: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  CLOSED: 4,
};

const ALL = 'ALL' as const;

export function DefectsPage() {
  const { currentProduct } = useProductContext();
  const [defects, setDefects] = useState<ApiDefect[] | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [testCases, setTestCases] = useState<ApiTestCase[]>([]);
  const [testScenarios, setTestScenarios] = useState<ApiTestScenario[]>([]);
  const [testExecutions, setTestExecutions] = useState<ApiTestExecution[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<ApiDefectSeverity | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = useState<ApiDefectStatus | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingDefect, setEditingDefect] = useState<ApiDefect | null>(null);
  const [viewingDefectId, setViewingDefectId] = useState<string | null>(null);
  const [deletingDefect, setDeletingDefect] = useState<ApiDefect | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadDefects = () => {
    setError(null);
    return fetchDefects(currentProduct?.id)
      .then((data) => setDefects(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load defects (HTTP ${err.status}).`
            : 'Failed to load defects. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setDefects(null);

    fetchDefects(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setDefects(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load defects (HTTP ${err.status}).`
            : 'Failed to load defects. Is the backend running?',
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

    fetchTestCases()
      .then((data) => {
        if (!cancelled) setTestCases(data);
      })
      .catch(() => {});

    fetchTestScenarios()
      .then((data) => {
        if (!cancelled) setTestScenarios(data);
      })
      .catch(() => {});

    fetchTestExecutions()
      .then((data) => {
        if (!cancelled) setTestExecutions(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleDefects = useMemo(() => {
    if (!defects) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = defects.filter((defect) => {
      if (
        query &&
        !defect.title.toLowerCase().includes(query) &&
        !defect.description.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (severityFilter !== ALL && defect.severity !== severityFilter) return false;
      if (statusFilter !== ALL && defect.status !== statusFilter) return false;
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
      case 'severity':
        sorted.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
        break;
      case 'status':
        sorted.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
        break;
    }
    return sorted;
  }, [defects, searchQuery, severityFilter, statusFilter, sortBy]);

  const isLoading = defects === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' || severityFilter !== ALL || statusFilter !== ALL;

  const handleCreateSubmit = async (data: CreateDefectPayload) => {
    await createDefect(data);
    await loadDefects();
    setSnackbar({ message: 'Defect reported.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateDefectPayload) => {
    if (!editingDefect) return;
    await updateDefect(editingDefect.id, data);
    await loadDefects();
    setSnackbar({ message: 'Defect updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDefect) return;
    await deleteDefect(deletingDefect.id);
    await loadDefects();
    setSnackbar({ message: 'Defect deleted.', severity: 'success' });
  };

  return (
    <>
      <PageHeader
        title="Defects"
        subtitle="Track and triage defects found during testing"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Report Defect
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
            placeholder="Search by title or description…"
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
            label="Severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as ApiDefectSeverity | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All Severities</MenuItem>
            {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
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
            onChange={(e) => setStatusFilter(e.target.value as ApiDefectStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 160 } }}
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
            sx={{ width: { xs: '100%', sm: 190 } }}
          >
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="oldest">Oldest first</MenuItem>
            <MenuItem value="severity">Severity (Critical-Trivial)</MenuItem>
            <MenuItem value="status">Status (Open-Closed)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {defects && defects.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No defects found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Report Defect
          </Button>
        </Paper>
      )}

      {defects && defects.length > 0 && visibleDefects.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters ? 'No defects match the current search/filters.' : 'No defects found.'}
          </Typography>
        </Paper>
      )}

      {visibleDefects.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleDefects.map((defect) => (
                <TableRow key={defect.id} hover>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2" noWrap>
                      {defect.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {defect.product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={SEVERITY_LABELS[defect.severity]} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={PRIORITY_LABELS[defect.priority]} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[defect.status]} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingDefectId(defect.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingDefect(defect);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingDefect(defect)}>
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

      <DefectFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        environments={environments}
        testCases={testCases}
        testScenarios={testScenarios}
        testExecutions={testExecutions}
        initialValues={
          formMode === 'edit' && editingDefect
            ? {
                productId: editingDefect.productId,
                environmentId: editingDefect.environmentId ?? '',
                testCaseId: editingDefect.testCaseId ?? '',
                testExecutionId: editingDefect.testExecutionId ?? '',
                title: editingDefect.title,
                description: editingDefect.description,
                stepsToReproduce: editingDefect.stepsToReproduce,
                expectedResult: editingDefect.expectedResult,
                actualResult: editingDefect.actualResult,
                severity: editingDefect.severity,
                priority: editingDefect.priority,
                status: editingDefect.status,
                assignedTo: editingDefect.assignedTo ?? '',
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingDefect(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <DefectDetailDialog defectId={viewingDefectId} onClose={() => setViewingDefectId(null)} />

      <DeleteDefectDialog
        defect={deletingDefect}
        onClose={() => setDeletingDefect(null)}
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
