import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface FeatureSectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  visual: ReactNode;
  reverse?: boolean;
}

export function FeatureSection({ id, eyebrow, title, description, bullets, visual, reverse }: FeatureSectionProps) {
  return (
    <Box id={id} sx={{ py: { xs: 7, md: 10 } }}>
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          display: 'flex',
          flexDirection: { xs: 'column', md: reverse ? 'row-reverse' : 'row' },
          alignItems: 'center',
          gap: { xs: 5, md: 8 },
        }}
      >
        <Box sx={{ flex: '1 1 480px', minWidth: 0 }}>
          <Typography variant="overline" color="secondary" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            {eyebrow}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.5rem', md: '1.85rem' } }}>
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {description}
          </Typography>
          <Stack spacing={1.5}>
            {bullets.map((bullet) => (
              <Stack key={bullet} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                <CheckCircleIcon sx={{ fontSize: 20, color: 'secondary.main', mt: '2px', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {bullet}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box sx={{ flex: '1 1 460px', minWidth: 0, width: '100%' }}>{visual}</Box>
      </Box>
    </Box>
  );
}
