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
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { AutomationFormDialog } from '../components/automation/AutomationFormDialog';
import { AutomationDetailDialog } from '../components/automation/AutomationDetailDialog';
import { DeleteAutomationDialog } from '../components/automation/DeleteAutomationDialog';
import { RecordAutomationRunDialog } from '../components/automation/RecordAutomationRunDialog';
import {
  createAutomation,
  deleteAutomation,
  fetchAutomations,
  recordAutomationRun,
  updateAutomation,
} from '../api/automation';
import { fetchTestCases } from '../api/testCases';
import { fetchTestScenarios } from '../api/testScenarios';
import { fetchEnvironments } from '../api/environments';
import { fetchReleases } from '../api/release';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import type {
  ApiAutomationFramework,
  ApiAutomationListItem,
  ApiAutomationRunStatus,
  ApiAutomationType,
  AutomationFramework,
  AutomationRunStatus,
  AutomationType,
  CreateAutomationPayload,
  CreateAutomationRunPayload,
} from '../types/automation';
import type { ApiTestCase } from '../types/testCase';
import type { ApiTestScenario } from '../types/testScenario';
import type { ApiEnvironment } from '../types/environment';
import type { ApiRelease } from '../types/release';

const TYPE_LABELS: Record<ApiAutomationType, AutomationType> = {
  UI: 'UI',
  API: 'API',
  UNIT: 'Unit',
  INTEGRATION: 'Integration',
  PERFORMANCE: 'Performance',
};

const FRAMEWORK_LABELS: Record<ApiAutomationFramework, AutomationFramework> = {
  PLAYWRIGHT: 'Playwright',
  SELENIUM: 'Selenium',
  CYPRESS: 'Cypress',
  JEST: 'Jest',
  POSTMAN: 'Postman',
  OTHER: 'Other',
};

const RUN_STATUS_LABELS: Record<ApiAutomationRunStatus, AutomationRunStatus> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  BLOCKED: 'Blocked',
  NOT_RUN: 'Not Run',
};

type SortOption = 'newest' | 'name' | 'lastRun';
type EnabledFilterOption = 'ENABLED' | 'DISABLED';

const ALL = 'ALL' as const;

export function AutomationPage() {
  const { currentProduct } = useProductContext();
  const [automations, setAutomations] = useState<ApiAutomationListItem[] | null>(null);
  const [testCases, setTestCases] = useState<ApiTestCase[]>([]);
  const [testScenarios, setTestScenarios] = useState<ApiTestScenario[]>([]);
  const [environments, setEnvironments] = useState<ApiEnvironment[]>([]);
  const [releases, setReleases] = useState<ApiRelease[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ApiAutomationType | typeof ALL>(ALL);
  const [frameworkFilter, setFrameworkFilter] = useState<ApiAutomationFramework | typeof ALL>(ALL);
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilterOption | typeof ALL>(ALL);
  const [lastRunStatusFilter, setLastRunStatusFilter] = useState<ApiAutomationRunStatus | typeof ALL>(
    ALL,
  );
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<ApiAutomationListItem | null>(null);
  const [viewingAutomationId, setViewingAutomationId] = useState<string | null>(null);
  const [deletingAutomation, setDeletingAutomation] = useState<ApiAutomationListItem | null>(null);
  const [recordingRunAutomation, setRecordingRunAutomation] =
    useState<ApiAutomationListItem | null>(null);

  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const loadAutomations = () => {
    setError(null);
    return fetchAutomations(currentProduct?.id)
      .then((data) => setAutomations(data))
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? `Failed to load automations (HTTP ${err.status}).`
            : 'Failed to load automations. Is the backend running?',
        );
      });
  };

  useEffect(() => {
    let cancelled = false;
    setAutomations(null);

    fetchAutomations(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setAutomations(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load automations (HTTP ${err.status}).`
            : 'Failed to load automations. Is the backend running?',
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

    // Unfiltered on purpose -- the Automation form has no Product context to
    // cascade off of, so the Release dropdown lists every release and labels
    // each option with its product (see AutomationFormDialog).
    fetchReleases()
      .then((data) => {
        if (!cancelled) setReleases(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleAutomations = useMemo(() => {
    if (!automations) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = automations.filter((automation) => {
      if (query && !automation.name.toLowerCase().includes(query)) return false;
      if (typeFilter !== ALL && automation.type !== typeFilter) return false;
      if (frameworkFilter !== ALL && automation.framework !== frameworkFilter) return false;
      if (enabledFilter !== ALL) {
        if (enabledFilter === 'ENABLED' && !automation.enabled) return false;
        if (enabledFilter === 'DISABLED' && automation.enabled) return false;
      }
      if (lastRunStatusFilter !== ALL && automation.lastRunStatus !== lastRunStatusFilter) {
        return false;
      }
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
      case 'lastRun':
        sorted.sort((a, b) => {
          const aTime = a.lastRunAt ? new Date(a.lastRunAt).getTime() : -Infinity;
          const bTime = b.lastRunAt ? new Date(b.lastRunAt).getTime() : -Infinity;
          return bTime - aTime;
        });
        break;
    }
    return sorted;
  }, [automations, searchQuery, typeFilter, frameworkFilter, enabledFilter, lastRunStatusFilter, sortBy]);

  const isLoading = automations === null && !error;
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== ALL ||
    frameworkFilter !== ALL ||
    enabledFilter !== ALL ||
    lastRunStatusFilter !== ALL;

  const handleCreateSubmit = async (data: CreateAutomationPayload) => {
    await createAutomation(data);
    await loadAutomations();
    setSnackbar({ message: 'Automation created.', severity: 'success' });
  };

  const handleEditSubmit = async (data: CreateAutomationPayload) => {
    if (!editingAutomation) return;
    await updateAutomation(editingAutomation.id, data);
    await loadAutomations();
    setSnackbar({ message: 'Automation updated.', severity: 'success' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAutomation) return;
    await deleteAutomation(deletingAutomation.id);
    await loadAutomations();
    setSnackbar({ message: 'Automation deleted.', severity: 'success' });
  };

  const handleRecordRunSubmit = async (data: CreateAutomationRunPayload) => {
    if (!recordingRunAutomation) return;
    await recordAutomationRun(recordingRunAutomation.id, data);
    await loadAutomations();
    setSnackbar({ message: 'Run result recorded.', severity: 'success' });
  };

  const handleExport = () => {
    exportToCsvWithAudit('Automation', 'automation.csv', visibleAutomations, [
      { header: 'Name', value: (a) => a.name },
      { header: 'Test Case', value: (a) => a.testCase.title },
      { header: 'Type', value: (a) => TYPE_LABELS[a.type] },
      { header: 'Framework', value: (a) => FRAMEWORK_LABELS[a.framework] },
      { header: 'Enabled', value: (a) => (a.enabled ? 'Yes' : 'No') },
      { header: 'Last Run Status', value: (a) => RUN_STATUS_LABELS[a.lastRunStatus] },
      {
        header: 'Last Run At',
        value: (a) => (a.lastRunAt ? new Date(a.lastRunAt).toLocaleString() : ''),
      },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Automation"
        subtitle="Manage automated test scripts and manually record their run results"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onExport={handleExport}
              exportDisabled={!automations || automations.length === 0}
              exportLabel="Export Automations"
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
              New Automation
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
            placeholder="Search by name…"
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
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ApiAutomationType | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
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
            label="Framework"
            value={frameworkFilter}
            onChange={(e) =>
              setFrameworkFilter(e.target.value as ApiAutomationFramework | typeof ALL)
            }
            sx={{ width: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value={ALL}>All Frameworks</MenuItem>
            {Object.entries(FRAMEWORK_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Enabled"
            value={enabledFilter}
            onChange={(e) => setEnabledFilter(e.target.value as EnabledFilterOption | typeof ALL)}
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All</MenuItem>
            <MenuItem value="ENABLED">Enabled</MenuItem>
            <MenuItem value="DISABLED">Disabled</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Last Run"
            value={lastRunStatusFilter}
            onChange={(e) =>
              setLastRunStatusFilter(e.target.value as ApiAutomationRunStatus | typeof ALL)
            }
            sx={{ width: { xs: '100%', sm: 150 } }}
          >
            <MenuItem value={ALL}>All</MenuItem>
            {Object.entries(RUN_STATUS_LABELS).map(([value, label]) => (
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
            <MenuItem value="name">Name (A-Z)</MenuItem>
            <MenuItem value="lastRun">Last run (newest)</MenuItem>
          </TextField>
        </Stack>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {automations && automations.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No automations found.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormMode('create')}>
            New Automation
          </Button>
        </Paper>
      )}

      {automations && automations.length > 0 && visibleAutomations.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No automations match the current search/filters.'
              : 'No automations found.'}
          </Typography>
        </Paper>
      )}

      {visibleAutomations.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Test Case</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Framework</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell>Last Run</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleAutomations.map((automation) => (
                <TableRow key={automation.id} hover>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {automation.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {automation.testCase.title}
                    </Typography>
                  </TableCell>
                  <TableCell>{TYPE_LABELS[automation.type]}</TableCell>
                  <TableCell>{FRAMEWORK_LABELS[automation.framework]}</TableCell>
                  <TableCell>
                    <StatusChip status={automation.enabled ? 'Enabled' : 'Disabled'} />
                  </TableCell>
                  <TableCell>
                    {automation.lastRunStatus === 'NOT_RUN' ? (
                      '—'
                    ) : (
                      <StatusChip status={RUN_STATUS_LABELS[automation.lastRunStatus]} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View">
                      <IconButton size="small" onClick={() => setViewingAutomationId(automation.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingAutomation(automation);
                          setFormMode('edit');
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Record Run Result">
                      <IconButton size="small" onClick={() => setRecordingRunAutomation(automation)}>
                        <PlaylistAddCheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeletingAutomation(automation)}>
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

      <AutomationFormDialog
        open={formMode !== null}
        mode={formMode ?? 'create'}
        testCases={testCases}
        testScenarios={testScenarios}
        environments={environments}
        releases={releases}
        initialValues={
          formMode === 'edit' && editingAutomation
            ? {
                testCaseId: editingAutomation.testCaseId,
                environmentId: editingAutomation.environmentId ?? '',
                releaseId: editingAutomation.releaseId ?? '',
                name: editingAutomation.name,
                type: editingAutomation.type,
                framework: editingAutomation.framework,
                description: editingAutomation.description ?? '',
                schedule: editingAutomation.schedule ?? '',
                enabled: editingAutomation.enabled,
              }
            : undefined
        }
        onClose={() => {
          setFormMode(null);
          setEditingAutomation(null);
        }}
        onSubmit={formMode === 'edit' ? handleEditSubmit : handleCreateSubmit}
      />

      <AutomationDetailDialog
        automationId={viewingAutomationId}
        onClose={() => setViewingAutomationId(null)}
      />

      <DeleteAutomationDialog
        automation={deletingAutomation}
        onClose={() => setDeletingAutomation(null)}
        onConfirm={handleDeleteConfirm}
      />

      <RecordAutomationRunDialog
        automation={recordingRunAutomation}
        onClose={() => setRecordingRunAutomation(null)}
        onSubmit={handleRecordRunSubmit}
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
