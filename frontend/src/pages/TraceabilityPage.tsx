import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
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
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import BlockIcon from '@mui/icons-material/Block';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BugReportIcon from '@mui/icons-material/BugReport';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { StatusChip } from '../components/common/StatusChip';
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { TestScenarioDetailDialog } from '../components/testscenario/TestScenarioDetailDialog';
import { TestCaseDetailDialog } from '../components/testcase/TestCaseDetailDialog';
import { TestExecutionDetailDialog } from '../components/testexecution/TestExecutionDetailDialog';
import { DefectDetailDialog } from '../components/defect/DefectDetailDialog';
import { RequirementTraceabilityDetailDialog } from '../components/traceability/RequirementTraceabilityDetailDialog';
import { fetchTraceabilityMatrix } from '../api/traceability';
import { ApiError } from '../api/client';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import { COVERAGE_STATUS_LABELS } from '../types/traceability';
import type {
  RequirementCoverageStatus,
  TraceabilityMatrix,
  TraceabilityRequirementRow,
} from '../types/traceability';

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const COVERAGE_STATUS_OPTIONS: RequirementCoverageStatus[] = [
  'NOT_COVERED',
  'NOT_EXECUTED',
  'IN_PROGRESS',
  'BLOCKED',
  'FAILED',
  'PASSED',
];

type SortOption = 'coverage-asc' | 'coverage-desc' | 'priority' | 'title';

const ALL = 'ALL' as const;

export function TraceabilityPage() {
  const { currentProduct } = useProductContext();
  const [matrix, setMatrix] = useState<TraceabilityMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [coverageStatusFilter, setCoverageStatusFilter] = useState<
    RequirementCoverageStatus | typeof ALL
  >(ALL);
  const [sortBy, setSortBy] = useState<SortOption>('coverage-asc');

  const [viewingRequirement, setViewingRequirement] = useState<TraceabilityRequirementRow | null>(
    null,
  );
  const [viewingScenarioId, setViewingScenarioId] = useState<string | null>(null);
  const [viewingTestCaseId, setViewingTestCaseId] = useState<string | null>(null);
  const [viewingExecutionId, setViewingExecutionId] = useState<string | null>(null);
  const [viewingDefectId, setViewingDefectId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMatrix(null);

    fetchTraceabilityMatrix(currentProduct?.id)
      .then((data) => {
        if (!cancelled) setMatrix(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load traceability data (HTTP ${err.status}).`
            : 'Failed to load traceability data. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const visibleRequirements = useMemo(() => {
    if (!matrix) return [];

    const query = searchQuery.trim().toLowerCase();
    const filtered = matrix.requirements.filter((row) => {
      if (query && !row.title.toLowerCase().includes(query)) return false;
      if (coverageStatusFilter !== ALL && row.coverageStatus !== coverageStatusFilter) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortBy) {
      case 'coverage-asc':
        sorted.sort((a, b) => a.coveragePercent - b.coveragePercent);
        break;
      case 'coverage-desc':
        sorted.sort((a, b) => b.coveragePercent - a.coveragePercent);
        break;
      case 'priority':
        sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }, [matrix, searchQuery, coverageStatusFilter, sortBy]);

  // The matrix itself is now fetched pre-scoped to the globally selected
  // product, so these no longer need their own product filtering.
  const visibleUnlinkedScenarios = useMemo(
    () => matrix?.unlinkedTestScenarios ?? [],
    [matrix],
  );

  const visibleOrphanTestCases = useMemo(() => matrix?.orphanTestCases ?? [], [matrix]);

  const visibleFailedWithoutDefects = useMemo(
    () => matrix?.failedExecutionsWithoutDefects ?? [],
    [matrix],
  );

  const visibleDefectsWithoutLinkage = useMemo(
    () => matrix?.defectsWithoutLinkage ?? [],
    [matrix],
  );

  const orphanRequirementCount = useMemo(
    () => (matrix ? matrix.requirements.filter((row) => row.testScenarioCount === 0).length : 0),
    [matrix],
  );

  const isLoading = matrix === null && !error;
  const hasActiveFilters = searchQuery.trim() !== '' || coverageStatusFilter !== ALL;
  const hasAnyData =
    matrix !== null &&
    (matrix.requirements.length > 0 ||
      matrix.unlinkedTestScenarios.length > 0 ||
      matrix.orphanTestCases.length > 0 ||
      matrix.defectsWithoutLinkage.length > 0);

  const summary = matrix?.summary;

  const handleExportMatrix = () => {
    exportToCsvWithAudit('TraceabilityMatrix', 'traceability-matrix.csv', visibleRequirements, [
      { header: 'Product', value: (r) => r.product.name },
      { header: 'Requirement', value: (r) => r.title },
      { header: 'Priority', value: (r) => PRIORITY_LABELS[r.priority] },
      { header: 'Scenario Count', value: (r) => r.testScenarioCount },
      { header: 'Test Case Count', value: (r) => r.testCaseCount },
      { header: 'Coverage %', value: (r) => r.coveragePercent },
      { header: 'Coverage Status', value: (r) => COVERAGE_STATUS_LABELS[r.coverageStatus] },
      { header: 'Defect Count', value: (r) => r.defectCount },
    ]);
  };

  const handleExportOrphanTestCases = () => {
    exportToCsvWithAudit(
      'TraceabilityOrphanTestCase',
      'traceability-orphan-test-cases.csv',
      visibleOrphanTestCases,
      [
        { header: 'Test Case', value: (tc) => tc.title },
        { header: 'Test Scenario', value: (tc) => tc.testScenario.title },
        { header: 'Requirement', value: (tc) => tc.requirement?.title ?? '' },
        { header: 'Product', value: (tc) => tc.product.name },
      ],
    );
  };

  return (
    <>
      <PageHeader
        title="Traceability"
        subtitle="End-to-end coverage from requirements through test scenarios, test cases, executions, and defects"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onExport={handleExportMatrix}
              exportDisabled={!matrix || visibleRequirements.length === 0}
              exportLabel="Export Coverage"
            />
            <ImportExportToolbar
              onExport={handleExportOrphanTestCases}
              exportDisabled={!matrix || visibleOrphanTestCases.length === 0}
              exportLabel="Export Orphan Test Cases"
            />
          </Stack>
        }
      />

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {matrix && !hasAnyData && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No traceability data yet. Add Requirements and Test Scenarios to start building
            coverage.
          </Typography>
        </Paper>
      )}

      {summary && hasAnyData && (
        <>
          <Typography variant="overline" color="text.secondary">
            Overall Traceability Health
          </Typography>
          <Grid container spacing={2} sx={{ mb: 1, mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard title="Requirements" value={summary.totalRequirements} icon={AssignmentIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard
                title="Requirement Coverage"
                value={`${summary.requirementCoveragePercent}%`}
                icon={AssignmentTurnedInIcon}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard title="Test Cases" value={summary.totalTestCases} icon={FactCheckIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard
                title="Test Case Coverage"
                value={`${summary.testCaseCoveragePercent}%`}
                icon={DonutLargeIcon}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard title="Pass Rate" value={`${summary.passRatePercent}%`} icon={TaskAltIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard title="Failed" value={summary.resultCounts.fail} icon={HighlightOffIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard title="Blocked" value={summary.resultCounts.blocked} icon={BlockIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard title="Orphan Requirements" value={orphanRequirementCount} icon={LinkOffIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard
                title="Orphan Test Cases"
                value={summary.orphanTestCaseCount}
                icon={ReportProblemIcon}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard
                title="Unlinked Test Scenarios"
                value={summary.unlinkedTestScenarioCount}
                icon={AccountTreeIcon}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard
                title="Failed Without Defects"
                value={summary.failedWithoutDefectCount}
                icon={WarningAmberIcon}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <SummaryCard
                title="Defects Without Linkage"
                value={summary.defectsWithoutLinkageCount}
                icon={BugReportIcon}
              />
            </Grid>
          </Grid>
        </>
      )}

      {hasAnyData && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 3 }}>
            Traceability Matrix
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            useFlexGap
            sx={{ mb: 2, flexWrap: 'wrap' }}
          >
            <TextField
              size="small"
              placeholder="Search by requirement title…"
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
              label="Coverage Status"
              value={coverageStatusFilter}
              onChange={(e) =>
                setCoverageStatusFilter(e.target.value as RequirementCoverageStatus | typeof ALL)
              }
              sx={{ width: { xs: '100%', sm: 180 } }}
            >
              <MenuItem value={ALL}>All Statuses</MenuItem>
              {COVERAGE_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {COVERAGE_STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              sx={{ width: { xs: '100%', sm: 200 } }}
            >
              <MenuItem value="coverage-asc">Lowest coverage first</MenuItem>
              <MenuItem value="coverage-desc">Highest coverage first</MenuItem>
              <MenuItem value="priority">Priority (Critical-Low)</MenuItem>
              <MenuItem value="title">Title (A-Z)</MenuItem>
            </TextField>
          </Stack>

          {matrix && matrix.requirements.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', mb: 3 }}>
              <Typography color="text.secondary">
                No requirements found. Add requirements on the Requirements page to begin tracing
                coverage.
              </Typography>
            </Paper>
          )}

          {matrix && matrix.requirements.length > 0 && visibleRequirements.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', mb: 3 }}>
              <Typography color="text.secondary">
                {hasActiveFilters
                  ? 'No requirements match the current search/filters.'
                  : 'No requirements found.'}
              </Typography>
            </Paper>
          )}

          {visibleRequirements.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Requirement</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Scenarios</TableCell>
                    <TableCell>Test Cases</TableCell>
                    <TableCell>Coverage</TableCell>
                    <TableCell>Coverage Status</TableCell>
                    <TableCell>Defects</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRequirements.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography variant="body2" noWrap>
                          {row.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {row.product.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={PRIORITY_LABELS[row.priority]} />
                      </TableCell>
                      <TableCell>{row.testScenarioCount}</TableCell>
                      <TableCell>{row.testCaseCount}</TableCell>
                      <TableCell sx={{ minWidth: 110 }}>
                        <Typography variant="caption" color="text.secondary">
                          {row.coveragePercent}% ({row.executedCount}/{row.testCaseCount})
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={row.coveragePercent}
                          sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={COVERAGE_STATUS_LABELS[row.coverageStatus]} />
                      </TableCell>
                      <TableCell>{row.defectCount}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Traceability">
                          <IconButton size="small" onClick={() => setViewingRequirement(row)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Gaps &amp; Orphans
          </Typography>

          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Unlinked Test Scenarios ({visibleUnlinkedScenarios.length})
              </Typography>
              {visibleUnlinkedScenarios.length === 0 ? (
                <Alert severity="success" variant="outlined">
                  Every test scenario is linked to a requirement.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Scenario</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Test Cases</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleUnlinkedScenarios.map((scenario) => (
                        <TableRow key={scenario.id} hover>
                          <TableCell sx={{ maxWidth: 260 }}>
                            <Typography variant="body2" noWrap>
                              {scenario.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {scenario.product.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{scenario.testCaseCount}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => setViewingScenarioId(scenario.id)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Orphan Test Cases — Never Executed ({visibleOrphanTestCases.length})
              </Typography>
              {visibleOrphanTestCases.length === 0 ? (
                <Alert severity="success" variant="outlined">
                  Every test case has at least one recorded execution.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Test Case</TableCell>
                        <TableCell>Test Scenario</TableCell>
                        <TableCell>Requirement</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleOrphanTestCases.map((testCase) => (
                        <TableRow key={testCase.id} hover>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Typography variant="body2" noWrap>
                              {testCase.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {testCase.testScenario.title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {testCase.requirement?.title ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {testCase.product.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => setViewingTestCaseId(testCase.id)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Failed Tests Without Defects ({visibleFailedWithoutDefects.length})
              </Typography>
              {visibleFailedWithoutDefects.length === 0 ? (
                <Alert severity="success" variant="outlined">
                  Every failed test execution has at least one linked defect.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Test Case</TableCell>
                        <TableCell>Environment</TableCell>
                        <TableCell>Executed By</TableCell>
                        <TableCell>Executed At</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleFailedWithoutDefects.map((execution) => (
                        <TableRow key={execution.id} hover>
                          <TableCell sx={{ maxWidth: 220 }}>
                            <Typography variant="body2" noWrap>
                              {execution.testCase?.title ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {execution.environment.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{execution.executedBy}</TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(execution.executedAt).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => setViewingExecutionId(execution.id)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Defects Without Test-Case/Execution Linkage ({visibleDefectsWithoutLinkage.length})
              </Typography>
              {visibleDefectsWithoutLinkage.length === 0 ? (
                <Alert severity="success" variant="outlined">
                  Every defect is linked to a test case or test execution.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Defect</TableCell>
                        <TableCell>Product</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleDefectsWithoutLinkage.map((defect) => (
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
                            <StatusChip
                              status={
                                { CRITICAL: 'Critical', MAJOR: 'Major', MINOR: 'Minor', TRIVIAL: 'Trivial' }[
                                  defect.severity
                                ]
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <StatusChip
                              status={
                                {
                                  OPEN: 'Open',
                                  IN_PROGRESS: 'In Progress',
                                  RESOLVED: 'Resolved',
                                  REOPENED: 'Reopened',
                                  CLOSED: 'Closed',
                                }[defect.status]
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View">
                              <IconButton size="small" onClick={() => setViewingDefectId(defect.id)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Stack>
        </>
      )}

      <RequirementTraceabilityDetailDialog
        requirement={viewingRequirement}
        onClose={() => setViewingRequirement(null)}
      />
      <TestScenarioDetailDialog testScenarioId={viewingScenarioId} onClose={() => setViewingScenarioId(null)} />
      <TestCaseDetailDialog testCaseId={viewingTestCaseId} onClose={() => setViewingTestCaseId(null)} />
      <TestExecutionDetailDialog
        testExecutionId={viewingExecutionId}
        onClose={() => setViewingExecutionId(null)}
      />
      <DefectDetailDialog defectId={viewingDefectId} onClose={() => setViewingDefectId(null)} />
    </>
  );
}
