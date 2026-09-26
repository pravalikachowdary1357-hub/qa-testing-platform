import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import BlockIcon from '@mui/icons-material/Block';
import BugReportIcon from '@mui/icons-material/BugReport';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import VerifiedIcon from '@mui/icons-material/Verified';
import type SvgIcon from '@mui/material/SvgIcon';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { StatusChip } from '../components/common/StatusChip';
import { BreakdownBar, colorForStatusLabel } from '../components/reports/BreakdownBar';
import { MetricTrendChart } from '../components/performance/MetricTrendChart';
import { PlatformAdminDashboard } from '../components/dashboard/PlatformAdminDashboard';
import { useAuth } from '../context/AuthContext';
import { useProductContext } from '../context/ProductContext';
import { fetchProductDashboardSummary } from '../api/products';
import { fetchDashboardConfig } from '../api/adminConfig';
import type { DashboardSectionKey } from '../types/adminConfig';
import { ApiError } from '../api/client';
import type {
  ApiProductDashboardSummary,
  ApiProductStatus,
  ApiReleaseReadiness,
  ProductStatus,
  ReleaseReadiness,
} from '../types/product';
import type { ApiDefectSeverity } from '../types/defect';
import type { ApiRequirementRisk } from '../types/requirement';

const STATUS_LABELS: Record<ApiProductStatus, ProductStatus> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

const READINESS_LABELS: Record<ApiReleaseReadiness, ReleaseReadiness> = {
  READY: 'Ready',
  CONDITIONAL: 'Conditional',
  NOT_READY: 'Not Ready',
};

const SEVERITY_LABELS: Record<ApiDefectSeverity, string> = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
  TRIVIAL: 'Trivial',
};

const RISK_LABELS: Record<ApiRequirementRisk, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

interface Kpi {
  title: string;
  value: string | number;
  icon: typeof SvgIcon;
}

export function DashboardPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentProduct, loading: productLoading, error: productError } = useProductContext();
  const [summary, setSummary] = useState<ApiProductDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  // Administrator-configured section visibility; if it can't be loaded,
  // every section stays visible (the pre-configuration behaviour).
  const [hiddenSections, setHiddenSections] = useState<DashboardSectionKey[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardConfig()
      .then((config) => {
        if (!cancelled) setHiddenSections(config.hiddenSections);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const show = (section: DashboardSectionKey) => !hiddenSections.includes(section);

  useEffect(() => {
    if (!currentProduct) {
      setSummary(null);
      setSummaryError(null);
      return;
    }

    let cancelled = false;
    setSummary(null);
    setSummaryLoading(true);
    setSummaryError(null);

    fetchProductDashboardSummary(currentProduct.id)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSummaryError(
          err instanceof ApiError
            ? `Failed to load dashboard data (HTTP ${err.status}).`
            : 'Failed to load dashboard data. Is the backend running?',
        );
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProduct?.id]);

  const loading = productLoading || summaryLoading;
  const error = productError ?? summaryError;

  const kpis: Kpi[] =
    currentProduct && summary
      ? [
          { title: 'Requirements', value: summary.requirements, icon: AssignmentIcon },
          { title: 'Active Test Plans', value: summary.activeTestPlans, icon: EventNoteIcon },
          { title: 'Test Cases', value: summary.testCases.toLocaleString(), icon: FactCheckIcon },
          {
            title: 'Tests Executed',
            value: summary.testsExecuted.toLocaleString(),
            icon: PlayCircleIcon,
          },
          { title: 'Pass Rate', value: `${summary.passRatePercent}%`, icon: TaskAltIcon },
          { title: 'Failed Tests', value: summary.failedTests, icon: HighlightOffIcon },
          { title: 'Blocked Tests', value: summary.blockedTests, icon: BlockIcon },
          { title: 'Open Defects', value: summary.openDefectsCount, icon: BugReportIcon },
          { title: 'Critical Defects', value: summary.criticalDefects, icon: ReportProblemIcon },
          { title: 'Test Coverage', value: `${summary.testCoveragePercent}%`, icon: DonutLargeIcon },
          {
            title: 'Automation Coverage',
            value: `${summary.automationCoveragePercent}%`,
            icon: SmartToyIcon,
          },
          {
            title: 'Release Readiness',
            value: READINESS_LABELS[summary.releaseReadiness],
            icon: VerifiedIcon,
          },
        ]
      : [];

  const defectSeverityDistribution = summary?.defectSeverityDistribution ?? [];
  const requirementRiskDistribution = summary?.requirementRiskDistribution ?? [];
  const testExecutionTrend = summary?.trends.testExecutionsPerWeek ?? [];
  const defectsOpenedTrend = summary?.trends.defectsOpenedPerWeek ?? [];

  // The Administrator administers the platform/organizations/users, not QA
  // execution -- it gets a platform-administration overview instead of the
  // per-product testing dashboard every other role sees.
  if (user?.roleName === 'System Administrator') {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Platform administration overview" />
        <PlatformAdminDashboard />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          currentProduct
            ? `Testing overview for ${currentProduct.name}`
            : 'Select a product to see its testing overview'
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !error && !currentProduct && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No product selected. Choose a product from the switcher above to see its testing
            overview.
          </Typography>
        </Paper>
      )}

      {!loading && !error && currentProduct && (
        <>
          {show('KPI_CARDS') && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {kpis.map((kpi) => (
              <Grid key={kpi.title} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <SummaryCard title={kpi.title} value={kpi.value} icon={kpi.icon} />
              </Grid>
            ))}
          </Grid>
          )}

          {show('PRODUCT_OVERVIEW') && (
          <>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Product Overview
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Test Coverage</TableCell>
                  <TableCell align="right">Pass Rate</TableCell>
                  <TableCell align="right">Open Defects</TableCell>
                  <TableCell>Release Readiness</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow hover>
                  <TableCell>{currentProduct.name}</TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[currentProduct.status]} />
                  </TableCell>
                  <TableCell align="right">{summary?.testCoveragePercent ?? 0}%</TableCell>
                  <TableCell align="right">{summary?.passRatePercent ?? 0}%</TableCell>
                  <TableCell align="right">{summary?.openDefectsCount ?? 0}</TableCell>
                  <TableCell>
                    {summary && <StatusChip status={READINESS_LABELS[summary.releaseReadiness]} />}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          </>
          )}

          {show('DISTRIBUTIONS') && (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Open Defects by Severity
                </Typography>
                <BreakdownBar
                  segments={defectSeverityDistribution.map((entry) => ({
                    key: entry.severity,
                    label: SEVERITY_LABELS[entry.severity],
                    value: entry.count,
                    color: colorForStatusLabel(SEVERITY_LABELS[entry.severity], theme),
                  }))}
                  emptyLabel="No open defects."
                />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Requirements by Risk
                </Typography>
                <BreakdownBar
                  segments={requirementRiskDistribution.map((entry) => ({
                    key: entry.riskLevel,
                    label: RISK_LABELS[entry.riskLevel],
                    value: entry.count,
                    color: colorForStatusLabel(RISK_LABELS[entry.riskLevel], theme),
                  }))}
                  emptyLabel="No requirements yet."
                />
              </Paper>
            </Grid>
          </Grid>
          )}

          {show('TRENDS') && (
          <>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            8-Week Trends
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <MetricTrendChart
              title="Test Executions per Week"
              color="#2a78d6"
              points={testExecutionTrend.map((point) => ({ timestamp: point.weekStart, value: point.count }))}
              formatValue={(value) => value.toLocaleString()}
            />
            <MetricTrendChart
              title="Defects Opened per Week"
              color="#e34948"
              points={defectsOpenedTrend.map((point) => ({ timestamp: point.weekStart, value: point.count }))}
              formatValue={(value) => value.toLocaleString()}
            />
          </Stack>
          </>
          )}
        </>
      )}
    </>
  );
}
