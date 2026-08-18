import { Paper, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { AiSourceContext } from '../../types/ai';

// Every generated suggestion shows exactly which real record it was built
// from -- satisfies "clear source/context used by each AI suggestion"
// without requiring the reader to dig into the raw prompt.
export function SourceContextCard({ context }: { context: AiSourceContext }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <InfoOutlinedIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          Generated from <strong>{context.type}</strong>: {context.title}
          {context.product ? ` (${context.product.name})` : ''}
        </Typography>
      </Stack>
    </Paper>
  );
}
