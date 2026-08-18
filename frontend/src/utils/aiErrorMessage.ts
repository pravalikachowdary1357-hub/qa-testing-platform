import { ApiError } from '../api/client';

// Every AI tab hits the same small set of distinctive statuses (503 not
// configured, 504 timeout, 429 rate limit, 403 features disabled) on top of
// the usual 400/404 -- centralized here so each tab doesn't reimplement it.
export function aiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 503:
        return 'AI provider is not configured. Set ANTHROPIC_API_KEY in the backend environment to enable this feature.';
      case 504:
        return 'The AI provider request timed out. Please try again.';
      case 429:
        return 'The AI provider rate limit was exceeded. Please wait a moment and try again.';
      case 403:
        return error.message || 'AI features are disabled for this deployment.';
      default:
        return error.message || `Request failed (HTTP ${error.status}).`;
    }
  }
  return 'Request failed. Is the backend running?';
}
