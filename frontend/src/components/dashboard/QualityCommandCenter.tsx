import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReplayIcon from '@mui/icons-material/Replay';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { fetchQualityCommandCenter } from '../../api/products';
import { ApiError } from '../../api/client';
import type { ApiQualityCommandCenter } from '../../types/product';

const BAND_COLOR: Record<ApiQualityCommandCenter['qualityHealthScore']['band'], string> = {
  HEALTHY: '#1E9E62',
  AT_RISK: '#D99A00',
  CRITICAL: '#D6364F',
};
const BAND_LABEL: Record<ApiQualityCommandCenter['qualityHealthScore']['band'], string> = {
  HEALTHY: 'Healthy',
  AT_RISK: 'At risk',
  CRITICAL: 'Critical',
};
const READINESS_COLOR: Record<ApiQualityCommandCenter['releaseReadiness'], string> = {
  READY: '#1E9E62',
  CONDITIONAL: '#D99A00',
  NOT_READY: '#D6364F',
};
const TREND_ICON = { RISING: TrendingUpIcon, FALLING: TrendingDownIcon, STABLE: TrendingFlatIcon };
const TREND_COLOR = { RISING: '#D6364F', FALLING: '#1E9E62', STABLE: 'text.secondary' };

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}

function InsightList({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <List dense disablePadding>
        {items.map((item, i) => (
          <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start' }}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>{icon}</ListItemIcon>
            <ListItemText primary={item} slotProps={{ primary: { variant: 'body2' } }} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

// AI Quality Command Center (Roles & Responsibilities section 27). Every
// number here is computed deterministically from real records -- the
// "AI-predicted" risk areas and regression recommendations are a
// transparent rules engine over that same data, not a live model call.
export function QualityCommandCenter({ productId }: { productId: string }) {
  const [data, setData] = useState<ApiQualityCommandCenter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchQualityCommandCenter(productId)
      .then((result) => !cancelled && setData(result))
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof ApiError
              ? `Failed to load the quality command center (HTTP ${err.status}).`
              : 'Failed to load the quality command center.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );

  const TrendIcon = TREND_ICON[data.defectRisk.trend];

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <AutoAwesomeIcon color="secondary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Quality Command Center
        </Typography>
        <Chip
          size="small"
          label={`Health: ${BAND_LABEL[data.qualityHealthScore.band]} (${data.qualityHealthScore.score}/100)`}
          sx={{ bgcolor: BAND_COLOR[data.qualityHealthScore.band], color: '#fff', fontWeight: 600 }}
        />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Metric label="Test coverage" value={`${data.testingCoverage.testCoveragePercent}%`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Metric label="Requirement coverage" value={`${data.testingCoverage.requirementCoveragePercent}%`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Metric label="Pass rate" value={`${data.testingCoverage.passRatePercent}%`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Release readiness
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: READINESS_COLOR[data.releaseReadiness] }}
          >
            {data.releaseReadiness === 'NOT_READY'
              ? 'Not ready'
              : data.releaseReadiness.charAt(0) + data.releaseReadiness.slice(1).toLowerCase()}
          </Typography>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <TrendIcon fontSize="small" sx={{ color: TREND_COLOR[data.defectRisk.trend] }} />
        <Typography variant="body2">
          Defect risk: {data.defectRisk.openCount} open ({data.defectRisk.criticalOpenCount} critical),
          averaging {data.defectRisk.averageAgeDays} day(s) old, trend {data.defectRisk.trend.toLowerCase()}.
        </Typography>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <InsightList
            icon={<WarningAmberIcon fontSize="small" color="warning" />}
            title="AI-predicted risk areas"
            items={data.aiPredictedRiskAreas}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <InsightList
            icon={<ReplayIcon fontSize="small" color="info" />}
            title="Regression recommendations"
            items={data.regressionRecommendations}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <InsightList
            icon={<AssignmentTurnedInIcon fontSize="small" color="secondary" />}
            title="Management actions"
            items={data.managementActions}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}
