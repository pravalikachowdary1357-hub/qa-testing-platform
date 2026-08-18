import { Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface ReportToolbarProps {
  onRefresh: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  openModulePath?: string;
  openModuleLabel?: string;
}

// The small action row every report tab renders in its header: refresh,
// optional CSV export of the currently displayed rows, and an optional
// real navigation link into the source module for a fuller view.
export function ReportToolbar({
  onRefresh,
  onExport,
  exportDisabled,
  openModulePath,
  openModuleLabel,
}: ReportToolbarProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
      <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={onRefresh}>
        Refresh
      </Button>
      {onExport && (
        <Button size="small" startIcon={<FileDownloadIcon fontSize="small" />} onClick={onExport} disabled={exportDisabled}>
          Export CSV
        </Button>
      )}
      {openModulePath && (
        <Button
          size="small"
          component={RouterLink}
          to={openModulePath}
          endIcon={<OpenInNewIcon fontSize="small" />}
        >
          {openModuleLabel ?? 'Open module'}
        </Button>
      )}
    </Stack>
  );
}
