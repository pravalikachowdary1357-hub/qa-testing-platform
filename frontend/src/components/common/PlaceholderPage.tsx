import { Paper, Stack, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import { PageHeader } from './PageHeader';

interface PlaceholderPageProps {
  title: string;
}

// Generic content for sidebar sections that don't have real functionality
// yet. One shared component instead of a near-duplicate page per module.
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} subtitle="This module is planned for a future milestone." />
      <Paper variant="outlined" sx={{ p: 6 }}>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <ConstructionIcon fontSize="large" color="disabled" />
          <Typography variant="h6" color="text.secondary">
            {title} is not implemented yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            This section will be built once the corresponding backend and business logic are
            ready.
          </Typography>
        </Stack>
      </Paper>
    </>
  );
}
