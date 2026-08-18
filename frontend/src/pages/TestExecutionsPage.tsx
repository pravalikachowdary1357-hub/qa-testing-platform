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
import { TestExecutionFormDialog } from '../components/testexecution/TestExecutionFormDialog';
import { TestExecutionDetailDialog } from '../components/testexecution/TestExecutionDetailDialog';
import { DeleteTestExecutionDialog } from '../components/testexecution/DeleteTestExecutionDialog';
import {
  createTestExecution,
  deleteTestExecution,
  fetchTestExecutions,
  updateTestExecution,
} from '../api/testExecutions';
import { fetchTestCases } from '../api/testCases';
import { fetchTestScenarios } from '../api/testScenarios';
import { fetchEnvironments } from '../api/environments';
import { fetchTestDataList } from '../api/testData';
import { ApiError } from '../api/client';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiTestExecution,
  ApiTestExecutionStatus,
  CreateTestExecutionPayload,
  TestExecutionStatus,
} from '../types/testExecution';
import type { ApiTestCase } from '../types/testCase';
import type { ApiTestScenario } from '../types/testScenario';
import type { ApiEnvironment } from '../types/environment';
import type { ApiTestDataListItem } from '../types/testData';

const STATUS_LABELS: Record<ApiTestExecutionStatus, TestExecutionStatus> = {
  PENDING: 'Pending',
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
};

type SortOption = 'newest' | 'oldest' | 'status';
const STATUS_RANK: Record<ApiTestExecutionStatus, number> = {
  FAIL: 0,
  BLOCKED: 1,
  PENDING: 2,
  PASS: 3,
};

const ALL = 'ALL' as const;

export function TestExecutionsPage() {
  const { currentProduct } = useProductContext();
  const [executions, setExecutions] = useState<ApiTestExecution[] | null>(null);
  const [testCases, setTestCases] = useState<ApiTestCase[]>([]);
  const [testScenarios, setTestScenarios] = useState<ApiTestScenario[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [testDataList, setTestDataList] = useState<ApiTestDataListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [testCaseFilter, setTestCaseFilter] = useState<string | typeof ALL>(ALL);
  const [environmentFilter, setEnvironmentFilter] = useState<string | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = useState<ApiTestExecutionStatus | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingExecution, setEditingExecution] = useState<ApiTestExecution | null>(null);
  const [viewingExecutionId, setViewingExecutionId] = useState<string | null>(null);
  const [deletingExecution, setDeletingExecution] = useState<ApiTestExecution | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadExecutions = () => {
    setError(null);
    return fetchTestExecutions(currentProduct?.id)
      .then((data) => setExecutions(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load test executions (HTTP ${err.status}).`
            : 'Failed to load test executions. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setExecutions(null);

    fetchTestExecutions(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setExecutions(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test executions (HTTP ${err.status}).`
            : 'Failed to load test executions. Is the backend running?',
        );
      });

    fetchTestCases(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestCases(data);
      })
      .catch(() => {});

    fetchTestScenarios(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestScenarios(data);
      })
      .catch(() => {});

    fetchEnvironments(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setEnvironments(data);
      })
      .catch(() => {});

    fetchTestDataList(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestDataList(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleExecutions = useMemo(() => {
    if (!executions) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = executions.filter((execution) => {
      if (
        query &&
        !execution.testCase.title.toLowerCase().includes(query) &&
        !execution.executedBy.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (testCaseFilter !== ALL && execution.testCaseId !== testCaseFilter) return false;
      if (environmentFilter !== ALL && execution.environmentId !== environmentFilter) return false;
      if (statusFilter !== ALL && execution.status !== statusFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => b.executedAt.localeCompare(a.executedAt));
        break;
      case 'oldest':
        sorted.sort((a, b) => a.executedAt.localeCompare(b.executedAt));
        break;
      case 'status':
        sorted.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
        break;
    }
    return sorted;
  }, [executions, searchQuery, testCaseFilter, environmentFilter, statusFilter, sortBy]);

  const isLoading = executions === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    testCaseFilter !== ALL ||
    environmentFilter !== ALL ||
    statusFilter !== ALL;

  const handleCreateSubmit = async (data: CreateTestExecutionPayload) => {
    await createTestExecution(data);
    await loadExecutions();
    setSnackbar({ message: 'Test execution recorded.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateTestExecutionPayload) => {
    if (!editingExecution) return;
    await updateTestExecution(editingExecution.id, data);
    await loadExecutions();
    setSnackbar({ message: 'Test execution updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExecution) return;
    await deleteTestExecution(deletingExecution.id);
    await loadExecutions();
    setSnackbar({ message: 'Test execution deleted.', severity: 'success' });
  };

  return (
    <>
      <PageHeader
        title="Test Execution"
        subtitle="Run test cases against real environments and record the results"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Start Execution
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
            placeholder="Search by test case or executor…"
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
            label="Test Case"
            value={testCaseFilter}
            onChange={(e) => setTestCaseFilter(e.target.value)}
            sx={{ width: { xs: '100%', sm: 180 } }}
          >
            <MenuItem value={ALL}>All Test Cases</MenuItem>
            {testCases.map((testCase) => (
              <MenuItem key={testCase.id} value={testCase.id}>
                {testCase.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Environment"
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            sx={{ width: { xs: '100%', sm: 160 } }}
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
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiTestExecutionStatus | typeof ALL)}
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
            <MenuItem value="status">Status (Fail-Pass)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {executions && executions.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No test executions found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Start Execution
          </Button>
        </Paper>
      )}

      {executions && executions.length > 0 && visibleExecutions.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No test executions match the current search/filters.'
              : 'No test executions found.'}
          </Typography>
        </Paper>
      )}

      {visibleExecutions.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Test Case</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Executed By</TableCell>
                <TableCell>Executed At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleExecutions.map((execution) => (
                <TableRow key={execution.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap>
                      {execution.testCase.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {execution.environment.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[execution.status]} />
                  </TableCell>
                  <TableCell>{execution.executedBy}</TableCell>
                  <TableCell>{new Date(execution.executedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingExecutionId(execution.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingExecution(execution);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingExecution(execution)}>
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

      <TestExecutionFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        testCases={testCases}
        testScenarios={testScenarios}
        environments={environments}
        testDataList={testDataList}
        initialValues={
          formMode === 'edit' && editingExecution
            ? {
                testCaseId: editingExecution.testCaseId,
                environmentId: editingExecution.environmentId,
                testDataId: editingExecution.testDataId ?? '',
                status: editingExecution.status,
                actualResult: editingExecution.actualResult ?? '',
                notes: editingExecution.notes ?? '',
                executedBy: editingExecution.executedBy,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingExecution(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <TestExecutionDetailDialog
        testExecutionId={viewingExecutionId}
        onClose={() => setViewingExecutionId(null)}
      />

      <DeleteTestExecutionDialog
        testExecution={deletingExecution}
        onClose={() => setDeletingExecution(null)}
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
