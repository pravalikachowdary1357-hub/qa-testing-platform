import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

// Parses a CSV file's raw bytes into an array of header-keyed row objects.
// Column names are trimmed; a malformed CSV (unbalanced quotes, etc.) is
// reported as a 400 rather than a 500.
export function parseCsvBuffer(buffer: Buffer): Record<string, string>[] {
  try {
    const rows = parse(buffer, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
    return rows;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new BadRequestException(`Could not parse CSV file: ${message}`);
  }
}
