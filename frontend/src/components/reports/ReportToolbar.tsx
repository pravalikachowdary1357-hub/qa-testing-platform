import { Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DescriptionIcon from '@mui/icons-material/Description';
import { withExportInterceptor } from '../../utils/csvExport';
import type { CsvColumn } from '../../utils/csvExport';
import { exportColumnsReport, exportDefectReport } from '../../utils/qmicsReport';
import { useReportHeader } from '../../utils/useReportHeader';

// "defect-report.csv" -> "Defect Report"
function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.csv$/i, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

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
  const header = useReportHeader('Reports');
  // The tab's own CSV export already knows the filename, rows and columns, so
  // the report button runs it with the download swapped for the QMICS Excel.
  const exportReport = () => {
    if (!onExport) return;
    withExportInterceptor(
      (filename, rows, columns) => {
        // The defect report uses the QMICS Defect Report template.
        if (filename === 'defect-report.csv') {
          const typed = columns as unknown as CsvColumn<unknown>[];
          const get = (row: unknown, name: string) =>
            String(typed.find((c) => c.header === name)?.value(row) ?? '');
          exportDefectReport(
            { ...header, moduleName: 'Defects' },
            rows.map((row, index) => ({
              id: `DEF-${String(index + 1).padStart(3, '0')}`,
              testCaseId: '',
              description: get(row, 'Title'),
              defectType: '',
              severity: get(row, 'Severity'),
              assignedTo: get(row, 'Assigned To'),
              priority: get(row, 'Priority'),
              engineerStatus: get(row, 'Status'),
              engineerRemarks: '',
              testerStatus: '',
              testerRemarks: '',
              closureDate: '',
            })),
            'Report:Defects',
          );
          return;
        }
        const title = titleFromFilename(filename);
        exportColumnsReport(
          { ...header, moduleName: title },
          {
            title,
            sheetName: title.slice(0, 31),
            tableTitle: `${title.toUpperCase()} DETAILS`,
            filenamePrefix: filename.replace(/\.csv$/i, ''),
            entityType: `Report:${title}`,
          },
          rows,
          columns as unknown as CsvColumn<unknown>[],
        );
      },
      onExport,
    );
  };
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
      {onExport && (
        <Button size="small" startIcon={<DescriptionIcon fontSize="small" />} onClick={exportReport} disabled={exportDisabled}>
          Export Report
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
