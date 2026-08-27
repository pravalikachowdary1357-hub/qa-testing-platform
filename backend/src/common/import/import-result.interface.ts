export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  errors: ImportRowError[];
}
