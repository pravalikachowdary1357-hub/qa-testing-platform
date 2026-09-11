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
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import { fetchProductDashboardSummary } from '../api/products';
import { ApiError } from '../api/client';
import type {
  ApiProductDashboardSummary,
  ApiProductStatus,
  ApiReleaseReadiness,
  ProductStatus,
  ReleaseReadiness,
} from '../types/product';

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

interface Kpi {
  title: string;
  value: string | number;
  icon: typeof SvgIcon;
}

export function DashboardPage() {
  const { currentProduct, loading: productLoading, error: productError } = useProductContext();
  const [summary, setSummary] = useState<ApiProductDashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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
          { title: 'Pass Rate', value: `${currentProduct.passRate}%`, icon: TaskAltIcon },
          { title: 'Failed Tests', value: summary.failedTests, icon: HighlightOffIcon },
          { title: 'Blocked Tests', value: summary.blockedTests, icon: BlockIcon },
          { title: 'Open Defects', value: currentProduct.openDefects, icon: BugReportIcon },
          { title: 'Critical Defects', value: summary.criticalDefects, icon: ReportProblemIcon },
          { title: 'Test Coverage', value: `${currentProduct.testCoverage}%`, icon: DonutLargeIcon },
          {
            title: 'Automation Coverage',
            value: `${summary.automationCoveragePercent}%`,
            icon: SmartToyIcon,
          },
          {
            title: 'Release Readiness',
            value: READINESS_LABELS[currentProduct.releaseReadiness],
            icon: VerifiedIcon,
          },
        ]
      : [];

  const handleExportKpis = () => {
    exportToCsvWithAudit('Dashboard', 'dashboard-kpis.csv', kpis, [
      { header: 'Metric', value: (kpi) => kpi.title },
      { header: 'Value', value: (kpi) => kpi.value },
    ]);
  };

  const handleExportProductOverview = () => {
    if (!currentProduct) return;
    exportToCsvWithAudit('Dashboard', 'dashboard-product-overview.csv', [currentProduct], [
      { header: 'Product', value: (p) => p.name },
      { header: 'Status', value: (p) => STATUS_LABELS[p.status] },
      { header: 'Test Coverage', value: (p) => `${p.testCoverage}%` },
      { header: 'Pass Rate', value: (p) => `${p.passRate}%` },
      { header: 'Open Defects', value: (p) => p.openDefects },
      { header: 'Release Readiness', value: (p) => READINESS_LABELS[p.releaseReadiness] },
    ]);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          currentProduct
            ? `Testing overview for ${currentProduct.name}`
            : 'Select a product to see its testing overview'
        }
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar
              onExport={handleExportKpis}
              exportDisabled={loading || !currentProduct || kpis.length === 0}
              exportLabel="Export KPIs"
            />
            <ImportExportToolbar
              onExport={handleExportProductOverview}
              exportDisabled={loading || !currentProduct}
              exportLabel="Export Product Overview"
            />
          </Stack>
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
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {kpis.map((kpi) => (
              <Grid key={kpi.title} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <SummaryCard title={kpi.title} value={kpi.value} icon={kpi.icon} />
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Product Overview
          </Typography>
          <TableContainer component={Paper} variant="outlined">
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
                  <TableCell align="right">{currentProduct.testCoverage}%</TableCell>
                  <TableCell align="right">{currentProduct.passRate}%</TableCell>
                  <TableCell align="right">{currentProduct.openDefects}</TableCell>
                  <TableCell>
                    <StatusChip status={READINESS_LABELS[currentProduct.releaseReadiness]} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
}
