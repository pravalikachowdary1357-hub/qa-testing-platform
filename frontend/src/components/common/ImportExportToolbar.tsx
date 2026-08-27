import { useRef } from 'react';
import { Button, Stack } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';

interface ImportExportToolbarProps {
  onImport?: (file: File) => void;
  onExport?: () => void;
  importDisabled?: boolean;
  exportDisabled?: boolean;
  importLabel?: string;
  exportLabel?: string;
}

// Reusable Import/Export button pair for a module's toolbar, matching the
// visual idiom already established by ReportToolbar (small outlined buttons
// with a leading icon). Import opens a hidden file input restricted to CSV;
// the caller owns everything after file selection (upload, result dialog,
// list refresh).
export function ImportExportToolbar({
  onImport,
  onExport,
  importDisabled,
  exportDisabled,
  importLabel = 'Import CSV',
  exportLabel = 'Export CSV',
}: ImportExportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Stack direction="row" spacing={1}>
      {onImport && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onImport(file);
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon fontSize="small" />}
            disabled={importDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            {importLabel}
          </Button>
        </>
      )}
      {onExport && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<FileUploadIcon fontSize="small" />}
          disabled={exportDisabled}
          onClick={onExport}
        >
          {exportLabel}
        </Button>
      )}
    </Stack>
  );
}
