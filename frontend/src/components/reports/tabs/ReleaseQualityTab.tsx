import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
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
  useTheme,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useState } from 'react';
import { SummaryCard } from '../../common/SummaryCard';
import { StatusChip } from '../../common/StatusChip';
import { ReportToolbar } from '../ReportToolbar';
import { BreakdownBar, colorForStatusLabel } from '../BreakdownBar';
import { ReportRecordDialog } from '../ReportRecordDialog';
import { useReportData } from '../../../hooks/useReportData';
import { fetchReleaseQualityReport } from '../../../api/reports';
import { exportToCsv } from '../../../utils/csvExport';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { ApiEnvironment } from '../../../types/environment';
import type { ReleaseQualityReportRow } from '../../../types/reports';

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  IN_TESTING: 'In Testing',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
const READINESS_LABELS: Record<string, string> = {
  READY: 'Ready',
  CONDITIONAL: 'Conditionally Ready',
  NOT_READY: 'Not Ready',
};

interface ReleaseQualityTabProps {
  products: ApiProduct[];
  environments: ApiEnvironment[];
}

export function ReleaseQualityTab({ products, environments }: ReleaseQualityTabProps) {
  const theme = useTheme();
  const { currentProduct } = useProductContext();
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [environmentId, setEnvironmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [readiness, setReadiness] = useState('');
  const [viewing, setViewing] = useState<ReleaseQualityReportRow | null>(null);

  const filteredEnvironments = productId ? environments.filter((e) => e.productId === productId) : environments;

  const { data, error, loading, refresh } = useReportData(
    () =>
      fetchReleaseQualityReport(
        {
          productId: productId || undefined,
          environmentId: environmentId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        status || undefined,
        readiness || undefined,
      ),
    [productId, environmentId, dateFrom, dateTo, status, readiness],
  );

  const isEmpty = data && data.rows.length === 0;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Product"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setEnvironmentId('');
          }}
          sx={{ width: { xs: '100%', sm: 170 } }}
        >
          <MenuItem value="">All Products</MenuItem>
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Environment"
          value={environmentId}
          onChange={(e) => setEnvironmentId(e.target.value)}
          sx={{ width: { xs: '100%', sm: 170 } }}
        >
          <MenuItem value="">All Environments</MenuItem>
          {filteredEnvironments.map((env) => (
            <MenuItem key={env.id} value={env.id}>
              {env.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 150 } }}
        />
        <TextField
          size="small"
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: '100%', sm: 150 } }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ width: { xs: '100%', sm: 140 } }}
        >
          <MenuItem value="">All Statuses</MenuItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Readiness"
          value={readiness}
          onChange={(e) => setReadiness(e.target.value)}
          sx={{ width: { xs: '100%', sm: 170 } }}
        >
          <MenuItem value="">All Readiness</MenuItem>
          {Object.entries(READINESS_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <ReportToolbar
          onRefresh={refresh}
          onExport={
            data
              ? () =>
                  exportToCsv('release-quality-report.csv', data.rows, [
                    { header: 'Release', value: (r) => `${r.name} (${r.version})` },
                    { header: 'Product', value: (r) => r.product.name },
                    { header: 'Status', value: (r) => r.status },
                    { header: 'Readiness', value: (r) => r.readiness },
                    { header: 'Pass Rate', value: (r) => r.passRatePercent },
                    { header: 'Open Defects', value: (r) => r.openDefects },
                  ])
              : undefined
          }
          exportDisabled={!data || data.rows.length === 0}
          openModulePath="/release-quality"
          openModuleLabel="Open in Release Quality"
        />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Releases" value={data.summary.totalReleases} icon={VerifiedIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Ready" value={data.summary.readinessCounts.ready} icon={VerifiedIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Conditionally Ready" value={data.summary.readinessCounts.conditional} icon={VerifiedIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Not Ready" value={data.summary.readinessCounts.notReady} icon={VerifiedIcon} />
            </Grid>
          </Grid>

          <BreakdownBar
            segments={[
              { key: 'ready', label: 'Ready', value: data.summary.readinessCounts.ready, color: colorForStatusLabel('Ready', theme) },
              { key: 'conditional', label: 'Conditionally Ready', value: data.summary.readinessCounts.conditional, color: colorForStatusLabel('Conditionally Ready', theme) },
              { key: 'notReady', label: 'Not Ready', value: data.summary.readinessCounts.notReady, color: colorForStatusLabel('Not Ready', theme) },
            ]}
          />

          {isEmpty && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No releases match the current filters.</Typography>
            </Paper>
          )}

          {!isEmpty && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Release</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Readiness</TableCell>
                    <TableCell align="right">Pass Rate</TableCell>
                    <TableCell align="right">Open Defects</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>
                          {row.name} ({row.version})
                        </Typography>
                      </TableCell>
                      <TableCell>{row.product.name}</TableCell>
                      <TableCell>
                        <StatusChip status={STATUS_LABELS[row.status] ?? row.status} />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={READINESS_LABELS[row.readiness] ?? row.readiness} />
                      </TableCell>
                      <TableCell align="right">{row.passRatePercent}%</TableCell>
                      <TableCell align="right">{row.openDefects}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => setViewing(row)}>
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
        </Stack>
      )}

      <ReportRecordDialog
        title={viewing ? `${viewing.name} (${viewing.version})` : null}
        subtitle={viewing?.product.name}
        fields={
          viewing
            ? [
                { label: 'Status', value: STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Readiness', value: READINESS_LABELS[viewing.readiness] ?? viewing.readiness },
                { label: 'Environment', value: viewing.environment?.name },
                { label: 'Release Date', value: viewing.releaseDate ? new Date(viewing.releaseDate).toLocaleDateString() : null },
                { label: 'Pass Rate', value: `${viewing.passRatePercent}%` },
                { label: 'Open Defects', value: viewing.openDefects },
                {
                  label: 'Failing Gates',
                  value:
                    viewing.failingGates.length === 0 ? (
                      'None -- all quality gates pass.'
                    ) : (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
                        {viewing.failingGates.map((gate) => (
                          <Chip
                            key={gate.key}
                            label={gate.label}
                            size="small"
                            color={gate.impact === 'BLOCKING' ? 'error' : 'warning'}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    ),
                },
              ]
            : []
        }
        onClose={() => setViewing(null)}
      />
    </Box>
  );
}
