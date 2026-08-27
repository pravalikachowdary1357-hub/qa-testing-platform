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
import { TestCaseFormDialog } from '../components/testcase/TestCaseFormDialog';
import { TestCaseDetailDialog } from '../components/testcase/TestCaseDetailDialog';
import { DeleteTestCaseDialog } from '../components/testcase/DeleteTestCaseDialog';
import {
  createTestCase,
  deleteTestCase,
  fetchTestCases,
  importTestCases,
  updateTestCase,
} from '../api/testCases';
import { fetchTestScenarios } from '../api/testScenarios';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiTestCase,
  ApiTestCasePriority,
  ApiTestCaseStatus,
  CreateTestCasePayload,
  TestCasePriority,
  TestCaseStatus,
} from '../types/testCase';
import type { ApiTestScenario } from '../types/testScenario';

const PRIORITY_LABELS: Record<ApiTestCasePriority, TestCasePriority> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const STATUS_LABELS: Record<ApiTestCaseStatus, TestCaseStatus> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  APPROVED: 'Approved',
  DEPRECATED: 'Deprecated',
};

const PRIORITY_RANK: Record<ApiTestCasePriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type SortOption = 'newest' | 'oldest' | 'priority' | 'title';

const ALL = 'ALL' as const;

export function TestCasesPage() {
  const { currentProduct } = useProductContext();
  const [testCases, setTestCases] = useState<ApiTestCase[] | null>(null);
  const [testScenarios, setTestScenarios] = useState<ApiTestScenario[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState<string | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = useState<ApiTestCaseStatus | typeof ALL>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<ApiTestCasePriority | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingTestCase, setEditingTestCase] = useState<ApiTestCase | null>(null);
  const [viewingTestCaseId, setViewingTestCaseId] = useState<string | null>(null);
  const [deletingTestCase, setDeletingTestCase] = useState<ApiTestCase | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);

  const loadTestCases = () => {
    setError(null);
    return fetchTestCases(currentProduct?.id)
      .then((data) => setTestCases(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load test cases (HTTP ${err.status}).`
            : 'Failed to load test cases. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setTestCases(null);

    fetchTestCases(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestCases(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load test cases (HTTP ${err.status}).`
            : 'Failed to load test cases. Is the backend running?',
        );
      });

    fetchTestScenarios(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setTestScenarios(data);
      })
      .catch(() => {
        // Only feeds the create/edit dropdown and the filter bar.
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleTestCases = useMemo(() => {
    if (!testCases) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = testCases.filter((testCase) => {
      if (query && !testCase.title.toLowerCase().includes(query)) return false;
      if (scenarioFilter !== ALL && testCase.testScenarioId !== scenarioFilter) return false;
      if (statusFilter !== ALL && testCase.status !== statusFilter) return false;
      if (priorityFilter !== ALL && testCase.priority !== priorityFilter) return false;
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
  }, [testCases, searchQuery, scenarioFilter, statusFilter, priorityFilter, sortBy]);

  const isLoading = testCases === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    scenarioFilter !== ALL ||
    statusFilter !== ALL ||
    priorityFilter !== ALL;

  const handleCreateSubmit = async (data: CreateTestCasePayload) => {
    await createTestCase(data);
    await loadTestCases();
    setSnackbar({ message: 'Test case created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateTestCasePayload) => {
    if (!editingTestCase) return;
    await updateTestCase(editingTestCase.id, data);
    await loadTestCases();
    setSnackbar({ message: 'Test case updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTestCase) return;
    await deleteTestCase(deletingTestCase.id);
    await loadTestCases();
    setSnackbar({ message: 'Test case deleted.', severity: 'success' });
  };

  const handleImport = async (file: File) => {
    if (!currentProduct) {
      setSnackbar({ message: 'Select a product before importing test cases.', severity: 'error' });
      return;
    }
    try {
      const result = await importTestCases(currentProduct.id, file);
      setImportResult(result);
      await loadTestCases();
    } catch (err: unknown) {
      setSnackbar({
        message: err instanceof ApiError ? `Import failed (HTTP ${err.status}).` : 'Import failed.',
        severity: 'error',
      });
    }
  };

  const handleExport = () => {
    exportToCsvWithAudit('TestCase', 'test-cases.csv', visibleTestCases, [
      { header: 'Title', value: (tc) => tc.title },
      { header: 'Test Scenario', value: (tc) => tc.testScenario.title },
      { header: 'Priority', value: (tc) => PRIORITY_LABELS[tc.priority] },
      { header: 'Status', value: (tc) => STATUS_LABELS[tc.status] },
      { header: 'Preconditions', value: (tc) => tc.preconditions ?? '' },
      { header: 'Expected Result', value: (tc) => tc.expectedResult },
      { header: 'Created', value: (tc) => new Date(tc.createdAt).toLocaleDateString() },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Test Cases"
        subtitle="Detailed, executable test procedures derived from test scenarios"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onImport={handleImport}
              onExport={handleExport}
              importDisabled={!currentProduct}
              exportDisabled={!testCases || testCases.length === 0}
              importLabel="Import Test Cases"
              exportLabel="Export Test Cases"
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
              Create Test Case
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
            placeholder="Search test cases by title…"
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
            label="Test Scenario"
            value={scenarioFilter}
            onChange={(e) => setScenarioFilter(e.target.value)}
            sx={{ width: { xs: '100%', sm: 180 } }}
          >
            <MenuItem value={ALL}>All Scenarios</MenuItem>
            {testScenarios.map((scenario) => (
              <MenuItem key={scenario.id} value={scenario.id}>
                {scenario.title}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApiTestCaseStatus | typeof ALL)}
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
            onChange={(e) => setPriorityFilter(e.target.value as ApiTestCasePriority | typeof ALL)}
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

      {testCases && testCases.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No test cases found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            Create Test Case
          </Button>
        </Paper>
      )}

      {testCases && testCases.length > 0 && visibleTestCases.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No test cases match the current search/filters.'
              : 'No test cases found.'}
          </Typography>
        </Paper>
      )}

      {visibleTestCases.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Test Scenario</TableCell>
                <TableCell>Steps</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTestCases.map((testCase) => (
                <TableRow key={testCase.id} hover>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap>
                      {testCase.title}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {testCase.testScenario.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{testCase.steps.length}</TableCell>
                  <TableCell>
                    <StatusChip status={PRIORITY_LABELS[testCase.priority]} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[testCase.status]} />
                  </TableCell>
                  <TableCell>{new Date(testCase.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingTestCaseId(testCase.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingTestCase(testCase);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingTestCase(testCase)}>
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

      <TestCaseFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        testScenarios={testScenarios}
        initialValues={
          formMode === 'edit' && editingTestCase
            ? {
                testScenarioId: editingTestCase.testScenarioId,
                title: editingTestCase.title,
                description: editingTestCase.description,
                preconditions: editingTestCase.preconditions ?? '',
                expectedResult: editingTestCase.expectedResult,
                priority: editingTestCase.priority,
                status: editingTestCase.status,
                steps: editingTestCase.steps
                  .slice()
                  .sort((a, b) => a.stepNumber - b.stepNumber)
                  .map((step) => ({ action: step.action, expectedResult: step.expectedResult })),
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingTestCase(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <TestCaseDetailDialog
        testCaseId={viewingTestCaseId}
        onClose={() => setViewingTestCaseId(null)}
      />

      <DeleteTestCaseDialog
        testCase={deletingTestCase}
        onClose={() => setDeletingTestCase(null)}
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
