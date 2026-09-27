import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fetchMyWork } from '../../api/myWork';
import { StatusChip } from '../common/StatusChip';
import { DEFECT_STATUS_LABELS } from '../../types/defect';
import type { ApiDefectStatus } from '../../types/defect';
import type { ApiMyWork, WorkTile, WorkTone } from '../../types/myWork';

const TONE_COLOR: Record<WorkTone, 'primary' | 'success' | 'warning' | 'error'> = {
  default: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

function statusLabel(status: string) {
  return (
    DEFECT_STATUS_LABELS[status as ApiDefectStatus] ??
    status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
  );
}

function TileCard({ tile }: { tile: WorkTile }) {
  const navigate = useNavigate();
  const color = TONE_COLOR[tile.tone ?? 'default'];
  const body = (
    <CardContent>
      <Typography variant="h5" sx={{ fontWeight: 700, color: `${color}.main` }}>
        {tile.value}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {tile.label}
      </Typography>
      {tile.hint && (
        <Typography variant="caption" color="text.secondary">
          {tile.hint}
        </Typography>
      )}
    </CardContent>
  );
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderLeft: 4,
        borderLeftColor: `${color}.main`,
        bgcolor: (theme) => alpha(theme.palette[color].main, 0.04),
      }}
    >
      {tile.link ? (
        <CardActionArea sx={{ height: '100%' }} onClick={() => navigate(tile.link!)} aria-label={`${tile.label}: ${tile.value}`}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </Card>
  );
}

// The signed-in role's own dashboard ("My Work"): its focus and
// responsibilities from the Roles & Responsibilities document, the figures
// it is accountable for, and the items waiting for it.
export function RoleDashboard({ productId }: { productId: string | undefined }) {
  const navigate = useNavigate();
  const [data, setData] = useState<ApiMyWork | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchMyWork(productId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Failed to load your dashboard.'));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ mb: 4 }}>
      <Paper
        variant="outlined"
        sx={{ p: 2.5, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.light' }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="overline" color="primary">
              {data.roleName}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {data.title}
              {data.product ? ` · ${data.product.name}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.focus}
            </Typography>
          </Box>
          {data.responsibilities.length > 0 && (
            <Box sx={{ maxWidth: { md: 520 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Your responsibilities
              </Typography>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {data.responsibilities.map((r) => (
                  <Chip key={r} size="small" label={r} variant="outlined" color="primary" />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>

      {data.notice && <Alert severity="info">{data.notice}</Alert>}

      {data.tiles.length > 0 && (
        <Grid container spacing={2}>
          {data.tiles.map((tile) => (
            <Grid key={tile.key} size={{ xs: 12, sm: 6, md: 4, lg: data.tiles.length > 6 ? 3 : 4 }}>
              <TileCard tile={tile} />
            </Grid>
          ))}
        </Grid>
      )}

      {data.lists.length > 0 && (
        <Grid container spacing={2}>
          {data.lists.map((list) => (
            <Grid key={list.key} size={{ xs: 12, md: data.lists.length > 1 ? 6 : 12 }}>
              <Paper variant="outlined" sx={{ height: '100%' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1.5, pb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {list.title}
                  </Typography>
                  {list.link && (
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={() => navigate(list.link!)}
                    >
                      View all
                    </Typography>
                  )}
                </Stack>
                {list.items.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 2 }}>
                    {list.emptyText}
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {list.items.map((item) => (
                      <ListItemButton key={`${list.key}-${item.id}`} onClick={() => item.link && navigate(item.link)}>
                        <ListItemText primary={item.title} secondary={item.meta} />
                        {item.status && <StatusChip status={statusLabel(item.status)} />}
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
