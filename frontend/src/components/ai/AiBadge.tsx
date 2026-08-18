import { Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Rendered next to every AI-generated field so it's never confused with
// user-created data, per the "clearly distinguish" requirement -- used
// consistently across every generation tab and the History log.
export function AiBadge() {
  return (
    <Chip
      icon={<AutoAwesomeIcon />}
      label="AI Suggested"
      size="small"
      color="secondary"
      variant="outlined"
    />
  );
}
