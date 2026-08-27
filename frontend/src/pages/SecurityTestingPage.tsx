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
import {
  SecurityTestFormDialog,
  securityTestToFormValues,
} from '../components/security/SecurityTestFormDialog';
import type { SecurityTestFormValues } from '../components/security/SecurityTestFormDialog';
import { SecurityTestDetailDialog } from '../components/security/SecurityTestDetailDialog';
import { DeleteSecurityTestDialog } from '../components/security/DeleteSecurityTestDialog';
import {
  createSecurityTest,
  deleteSecurityTest,
  fetchSecurityTest,
  fetchSecurityTests,
  fetchSecurityTestsSummary,
  updateSecurityTest,
} from '../api/securityTesting';
import { fetchProducts } from '../api/products';
import { fetchEnvironments } from '../api/environments';
import { fetchTestCases } from '../api/testCases';
import { fetchTestScenarios } from '../api/testScenarios';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import {
  ALL_SEVERITIES,
  ALL_VULN_STATUSES,
  SEVERITY_LABELS,
  TEST_STATUS_LABELS,
  TEST_TYPE_LABELS,
  VULN_STATUS_LABELS,
} from '../types/securityTesting';
import type {
  CreateSecurityTestPayload,
  SecurityFindingSummary,
  SecurityTestListItem,
  SecurityTestStatus,
} from '../types/securityTesting';
import type { ApiProduct } from '../types/product';
import type { ApiEnvironment } from '../types/environment';
import type { ApiTestCase } from '../types/testCase';
import type { ApiTestScenario } from '../types/testScenario';

type SortOption = 'newest' | 'name';

const ALL = 'ALL' as const;

const STATUS_OPTIONS: SecurityTestStatus[] = ['NOT_STARTED', 'RUNNING', 'PASSED', 'FAILED'];

const SEVERITY_TONE: Record<string, 'error' | 'warning' | 'default'> = {
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'default',
  INFO: 'default',
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'error' | 'warning' | 'default';
}) {
  const color = tone === 'error' ? 'error.main' : tone === 'warning' ? 'warning.main' : 'text.primary';
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 100, flex: 1, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, color }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

export function SecurityTestingPage() {
  const { currentProduct } = useProductContext();
  const [tests, setTests] = useState<SecurityTestListItem[] | null>(null);
  const [summary, setSummary] = useState<SecurityFindingSummary | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [testCases, setTestCases] = useState<ApiTestCase[]>([]);
  const [testScenarios, setTestScenarios] = useState<ApiTestScenario[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SecurityTestStatus | typeof ALL>(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editingFormValues, setEditingFormValues] = useState<SecurityTestFormValues | null>(null);
  const [viewingTestId, setViewingTestId] = useState<string | null>(null);
  const [deletingTest, setDeletingTest] = useState<SecurityTestListItem | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadTests = () => {
    setError(null);
    return Promise.all([
      fetchSecurityTests(currentProduct?.id),
      fetchSecurityTestsSummary(currentProduct?.id),
    ])
      .then(([testsData, summaryData]) => {
        setTests(testsData);
        setSummary(summaryData);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load security tests (HTTP ${err.status}).`
            : 'Failed to load security tests. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setTests(null);

    Promise.all([
      fetchSecurityTests(currentProduct?.id),
      fetchSecurityTestsSummary(currentProduct?.id),
    ])
      .then(([testsData, summaryData]) => {
        if (cancelled) return;
        setTests(testsData);
        setSummary(summaryData);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load security tests (HTTP ${err.status}).`
            : 'Failed to load security tests. Is the backend running?',
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
        !test.target.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (statusFilter !== ALL && test.status !== statusFilter) return false;
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

  const handleCreateSubmit = async (data: CreateSecurityTestPayload) => {
    await createSecurityTest(data);
    await loadTests();
    setSnackbar({ message: 'Security test created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateSecurityTestPayload) => {
    if (!editingTestId) return;
    await updateSecurityTest(editingTestId, data);
    await loadTests();
    setSnackbar({ message: 'Security test updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTest) return;
    await deleteSecurityTest(deletingTest.id);
    await loadTests();
    setSnackbar({ message: 'Security test deleted.', severity: 'success' });
  };

  const handleEditClick = async (item: SecurityTestListItem) => {
    try {
      const full = await fetchSecurityTest(item.id);
      setEditingTestId(full.id);
      setEditingFormValues(securityTestToFormValues(full));
      setFormMode('edit');
    } catch (err: unknown) {
      setSnackbar({
        message:
          err instanceof ApiError
            ? `Failed to load security test (HTTP ${err.status}).`
            : 'Failed to load security test for editing.',
        severity: 'error',
      });
    }
  };

  const handleExport = () => {
    exportToCsvWithAudit('SecurityTest', 'security-tests.csv', visibleTests, [
      { header: 'Name', value: (t) => t.name },
      { header: 'Target', value: (t) => t.target },
      { header: 'Test Type', value: (t) => TEST_TYPE_LABELS[t.testType] },
      { header: 'Status', value: (t) => TEST_STATUS_LABELS[t.status] },
      {
        header: 'Last Executed At',
        value: (t) => (t.lastExecutedAt ? new Date(t.lastExecutedAt).toLocaleString() : ''),
      },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Security Testing"
        subtitle="Track security test suites, execution status, and vulnerability findings"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onExport={handleExport}
              exportDisabled={!tests || tests.length === 0}
              exportLabel="Export Security Tests"
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
              New Security Test
            </Button>
          </Stack>
        }
      />

      {summary && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Findings by Severity
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              {ALL_SEVERITIES.map((severity) => (
                <SummaryCard
                  key={severity}
                  label={SEVERITY_LABELS[severity]}
                  value={summary.bySeverity[severity]}
                  tone={SEVERITY_TONE[severity]}
                />
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Findings by Status
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
              {ALL_VULN_STATUSES.map((status) => (
                <SummaryCard
                  key={status}
                  label={VULN_STATUS_LABELS[status]}
                  value={summary.byStatus[status]}
                  tone="default"
                />
              ))}
            </Stack>
          </Box>
        </Stack>
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
            placeholder="Search by name or target…"
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
            onChange={(e) => setStatusFilter(e.target.value as SecurityTestStatus | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 170 } }}
          >
            <MenuItem value={ALL}>All Statuses</MenuItem>
            {STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {TEST_STATUS_LABELS[status]}
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
            No security tests found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New Security Test
          </Button>
        </Paper>
      )}

      {tests && tests.length > 0 && visibleTests.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No security tests match the current search/filters.'
              : 'No security tests found.'}
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
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Findings</TableCell>
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
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {test.target}
                    </Typography>
                  </TableCell>
                  <TableCell>{TEST_TYPE_LABELS[test.testType]}</TableCell>
                  <TableCell>
                    <StatusChip status={TEST_STATUS_LABELS[test.status]} />
                  </TableCell>
                  <TableCell>{test._count.findings}</TableCell>
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

      <SecurityTestFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        products={products}
        environments={environments}
        testCases={testCases}
        testScenarios={testScenarios}
        currentProductId={currentProduct?.id}
        initialValues={formMode === 'edit' ? (editingFormValues ?? undefined) : undefined}
        onClose={() => {
          setFormMode(null);
          setEditingTestId(null);
          setEditingFormValues(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <SecurityTestDetailDialog
        securityTestId={viewingTestId}
        onClose={() => {
          setViewingTestId(null);
          void loadTests();
        }}
        onMutate={() => void loadTests()}
      />

      <DeleteSecurityTestDialog
        securityTest={deletingTest}
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
