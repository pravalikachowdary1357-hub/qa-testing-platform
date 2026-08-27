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
import Inventory2Icon from '@mui/icons-material/Inventory2';
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
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { StatusChip } from '../components/common/StatusChip';
import { ImportExportToolbar } from '../components/common/ImportExportToolbar';
import { mockDashboardSummary } from '../data/mockDashboard';
import { exportToCsvWithAudit } from '../utils/csvExport';
import { useProductContext } from '../context/ProductContext';
import type {
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

const kpis = [
  { title: 'Products', value: mockDashboardSummary.totalProducts, icon: Inventory2Icon },
  { title: 'Active Test Plans', value: mockDashboardSummary.activeTestPlans, icon: EventNoteIcon },
  {
    title: 'Test Cases',
    value: mockDashboardSummary.testCases.toLocaleString(),
    icon: FactCheckIcon,
  },
  {
    title: 'Tests Executed',
    value: mockDashboardSummary.testsExecuted.toLocaleString(),
    icon: PlayCircleIcon,
  },
  { title: 'Pass Rate', value: `${mockDashboardSummary.passRate}%`, icon: TaskAltIcon },
  { title: 'Failed Tests', value: mockDashboardSummary.failedTests, icon: HighlightOffIcon },
  { title: 'Blocked Tests', value: mockDashboardSummary.blockedTests, icon: BlockIcon },
  { title: 'Open Defects', value: mockDashboardSummary.openDefects, icon: BugReportIcon },
  {
    title: 'Critical Defects',
    value: mockDashboardSummary.criticalDefects,
    icon: ReportProblemIcon,
  },
  { title: 'Test Coverage', value: `${mockDashboardSummary.testCoverage}%`, icon: DonutLargeIcon },
  {
    title: 'Automation Coverage',
    value: `${mockDashboardSummary.automationCoverage}%`,
    icon: SmartToyIcon,
  },
  { title: 'Release Readiness', value: mockDashboardSummary.releaseReadiness, icon: VerifiedIcon },
];

export function DashboardPage() {
  const { products, loading, error } = useProductContext();

  const handleExportKpis = () => {
    exportToCsvWithAudit('Dashboard', 'dashboard-kpis.csv', kpis, [
      { header: 'Metric', value: (kpi) => kpi.title },
      { header: 'Value', value: (kpi) => kpi.value },
    ]);
  };

  const handleExportProductOverview = () => {
    exportToCsvWithAudit('Dashboard', 'dashboard-product-overview.csv', products, [
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
        subtitle="Organization-wide testing overview across all products"
        actions={
          <Stack direction="row" spacing={1}>
            <ImportExportToolbar onExport={handleExportKpis} exportLabel="Export KPIs" />
            <ImportExportToolbar
              onExport={handleExportProductOverview}
              exportDisabled={loading || products.length === 0}
              exportLabel="Export Product Overview"
            />
          </Stack>
        }
      />

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
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {!loading && products.length === 0 && !error && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No products found.</Typography>
        </Paper>
      )}
      {!loading && products.length > 0 && (
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
              {products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>
                    <StatusChip status={STATUS_LABELS[product.status]} />
                  </TableCell>
                  <TableCell align="right">{product.testCoverage}%</TableCell>
                  <TableCell align="right">{product.passRate}%</TableCell>
                  <TableCell align="right">{product.openDefects}</TableCell>
                  <TableCell>
                    <StatusChip status={READINESS_LABELS[product.releaseReadiness]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}
