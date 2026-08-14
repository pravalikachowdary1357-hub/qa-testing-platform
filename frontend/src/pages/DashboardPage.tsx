import {
  Grid,
  Paper,
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
import { mockDashboardSummary } from '../data/mockDashboard';
import { mockProducts } from '../data/mockProducts';

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
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Organization-wide testing overview across all products"
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
            {mockProducts.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>{product.name}</TableCell>
                <TableCell>
                  <StatusChip status={product.status} />
                </TableCell>
                <TableCell align="right">{product.testCoverage}%</TableCell>
                <TableCell align="right">{product.passRate}%</TableCell>
                <TableCell align="right">{product.openDefects}</TableCell>
                <TableCell>
                  <StatusChip status={product.releaseReadiness} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
