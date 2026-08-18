import { Alert, AlertTitle, Typography } from '@mui/material';
import type { AiStatus } from '../../types/ai';

interface AiStatusBannerProps {
  status: AiStatus | null;
  error: string | null;
}

// Always visible at the top of /ai, regardless of which tab is active --
// this is the honest, unavoidable statement of whether generation actually
// works right now. Out of the box (no ANTHROPIC_API_KEY set) this shows the
// "not configured" state; nothing below it should ever pretend otherwise.
export function AiStatusBanner({ status, error }: AiStatusBannerProps) {
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>Could not reach the AI status endpoint</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (!status) return null;

  if (!status.featuresEnabled) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>AI features disabled</AlertTitle>
        An administrator has disabled AI features for this deployment (<code>AI_FEATURES_ENABLED=false</code>).
      </Alert>
    );
  }

  if (!status.configured) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>AI provider not configured</AlertTitle>
        <Typography variant="body2">
          Generation, analysis, and chat features below require a real AI provider connection and will
          return a clear error until one is configured -- nothing here fabricates a response. Set{' '}
          <code>ANTHROPIC_API_KEY</code> (and optionally <code>ANTHROPIC_MODEL</code>) in the backend
          environment to enable them.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          The <strong>Duplicate Defects</strong> tab works right now regardless -- it uses a deterministic
          text-similarity heuristic, not an external AI call.
        </Typography>
      </Alert>
    );
  }

  return (
    <Alert severity="success" sx={{ mb: 3 }}>
      <AlertTitle>AI provider connected</AlertTitle>
      Model: <code>{status.model}</code>
    </Alert>
  );
}
