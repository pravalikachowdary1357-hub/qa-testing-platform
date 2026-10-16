import { logExportEvent } from '../api/auditLog';

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Client-side only, real browser download of exactly what's on screen --
// no export endpoint exists (or is needed) on the backend for this.
type ExportInterceptor = (filename: string, rows: unknown[], columns: CsvColumn<never>[]) => void;
let interceptor: ExportInterceptor | null = null;

// Lets a caller (the "Export Report" button) temporarily turn the next CSV
// export into a different download built from the same rows and columns.
export function withExportInterceptor(fn: ExportInterceptor, run: () => void): void {
  interceptor = fn;
  try {
    run();
  } finally {
    interceptor = null;
  }
}

export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): boolean {
  if (interceptor) {
    interceptor(filename, rows, columns as unknown as CsvColumn<never>[]);
    return true;
  }
  const lines = [
    columns.map((column) => escapeCsvCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return false;
}

// Same as exportToCsv, plus a fire-and-forget audit trail entry. The export
// itself already happened client-side by the time this runs, so a failed
// audit call is logged but never blocks or undoes the download.
export function exportToCsvWithAudit<T>(
  entityType: string,
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  if (exportToCsv(filename, rows, columns)) return; // report export audits itself
  logExportEvent(entityType, `Exported ${rows.length} row(s) to ${filename}`).catch((error) => {
    console.error('Failed to record export audit event', error);
  });
}
