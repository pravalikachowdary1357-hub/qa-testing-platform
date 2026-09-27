import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { fetchModuleStats } from '../../api/moduleStats';
import type { ApiModuleStat, ModuleStatTone } from '../../api/moduleStats';
import { useProductContext } from '../../context/ProductContext';
import { BRAND, moduleKeyFromPath, moduleTheme } from '../../theme/moduleThemes';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

// TestSphere palette for the summary cards.
const TONE: Record<ModuleStatTone, string> = {
  primary: '#1454A6',
  info: '#2A86DB',
  success: '#1E9E62',
  warning: '#D99A00',
  error: '#D6364F',
};

// Buttons and inputs passed in as `actions` are restyled to sit on the
// coloured banner (white outline / white filled), without changing them.
const heroActionsSx = (accent: string) => ({
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 1,
  alignItems: 'center',
  justifyContent: { xs: 'flex-start', md: 'flex-end' },
  '& .MuiStack-root': { flexWrap: 'wrap', gap: 1, '& > :not(style) ~ :not(style)': { ml: 0 } },
  '& .MuiButton-root': { whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 600, borderRadius: 2 },
  '& .MuiButton-outlined': {
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.6)',
    bgcolor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(4px)',
    '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.22)' },
    '&.Mui-disabled': { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.3)' },
  },
  '& .MuiButton-contained': {
    bgcolor: BRAND.gold,
    color: accent,
    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
    '&:hover': { bgcolor: '#FFC933' },
  },
  '& .MuiButton-text': { color: '#fff' },
  '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 2 },
  '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': { color: 'text.secondary' },
  '& .MuiIconButton-root': { color: '#fff' },
});

// Module page header: a coloured banner (per module) with the page icon,
// title, subtitle and actions, followed by the module's summary figures.
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const { pathname } = useLocation();
  const moduleKey = moduleKeyFromPath(pathname);
  const theme = moduleTheme(pathname);
  const Icon = theme.icon;
  const { currentProduct } = useProductContext();
  const [stats, setStats] = useState<ApiModuleStat[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    // The dashboard has its own figures; every other module shows four.
    if (!moduleKey) return;
    fetchModuleStats(moduleKey, currentProduct?.id)
      .then((data) => !cancelled && setStats(data))
      .catch(() => !cancelled && setStats(null)); // no permission / unknown module: no stats row
    return () => {
      cancelled = true;
    };
  }, [moduleKey, currentProduct?.id]);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          px: { xs: 2.5, md: 4 },
          py: { xs: 2.5, md: 3.5 },
          color: '#fff',
          background: theme.gradient,
          borderBottom: `4px solid ${BRAND.gold}`,
          boxShadow: '0 10px 30px rgba(10, 42, 87, 0.22)',
        }}
      >
        {/* Decorative shapes */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: -60,
            top: -80,
            width: 260,
            height: 260,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.08)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: 140,
            bottom: -110,
            width: 220,
            height: 220,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ position: 'relative', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: BRAND.gold,
                color: BRAND.navy,
                boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
              }}
            >
              <Icon sx={{ fontSize: 30 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.6rem', md: '2rem' }, lineHeight: 1.2 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body1" sx={{ opacity: 0.88, mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>
          {actions && <Box sx={heroActionsSx(theme.accent)}>{actions}</Box>}
        </Stack>
      </Box>

      {stats && stats.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {stats.map((stat) => {
            const color = TONE[stat.tone] ?? TONE.primary;
            return (
              <Grid key={stat.key} size={{ xs: 12, sm: 6, lg: 3 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    borderRadius: 3,
                    borderColor: alpha(color, 0.18),
                    background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, #fff 70%)`,
                    boxShadow: '0 4px 14px rgba(15, 40, 60, 0.06)',
                  }}
                >
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color }}>
                        {stat.label}
                      </Typography>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: 2,
                          bgcolor: color,
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon sx={{ fontSize: 18 }} />
                      </Box>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'text.primary' }}>
                      {stat.value}
                    </Typography>
                    {stat.hint && (
                      <Typography variant="caption" sx={{ color, fontWeight: 500 }}>
                        {stat.hint}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
