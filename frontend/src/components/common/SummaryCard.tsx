import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type SvgIcon from '@mui/material/SvgIcon';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: typeof SvgIcon;
}

export function SummaryCard({ title, value, icon: Icon }: SummaryCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {title}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
