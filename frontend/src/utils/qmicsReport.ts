import { logExportEvent } from '../api/auditLog';
import { createSheet, downloadXlsx, mergeCells, setCell } from './xlsx';
import type { CellStyle, CellValue } from './xlsx';
import type { CsvColumn } from './csvExport';

// QMICS-branded Excel reports. The Test Case and Defect layouts follow the
// company's "Test Case Report" and "Defect Report" templates; every other
// module (requirements, test plans, test scenarios) uses the same banner,
// sign-off block, table and footer through exportListReport.

export interface ReportHeader {
  projectName: string;
  projectId: string;
  moduleName: string;
  testType: string;
  preparedBy: string;
  date: string;
}

const COMPANY = 'QMICS Solutions';
const FOOTER = 'Copyright © 2026. All Rights Reserved.  |  Confidential';
const DEFECT_FOOTER = 'Copyright © 2026, QMICS Solutions';

function auditExport(entityType: string, filename: string, count: number): void {
  logExportEvent(entityType, `Exported ${count} row(s) to ${filename}`).catch((error) => {
    console.error('Failed to record export audit event', error);
  });
}

// Estimated row height (points) so wrapped text is fully visible in Excel.
function rowHeight(values: CellValue[], widths: number[], min: number, lineHeight = 14.5): number {
  let lines = 1;
  values.forEach((value, index) => {
    const text = value === null || value === undefined ? '' : String(value);
    const chars = Math.max(4, Math.floor((widths[index] ?? 12) * 1.05));
    const count = text
      .split('\n')
      .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / chars)), 0);
    if (count > lines) lines = count;
  });
  return Math.min(409, Math.max(min, lines * lineHeight + 6));
}

function safeFilePart(text: string): string {
  return text.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/^_+|_+$/g, '') || 'report';
}

export function reportFilename(prefix: string, header: ReportHeader): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}_${safeFilePart(header.projectName)}_${stamp}.xlsx`;
}

// ================================================================ Test Case

const TC = {
  navy: '1B3A6B',
  paleBlue: 'DBEAFE',
  blue: '2563EB',
  deepBlue: '1E40AF',
  line: 'CBD5E1',
  ink: '1E293B',
};

export interface TestCaseReportRow {
  id: string;
  objective: string;
  preCondition: string;
  steps: string;
  inputData: string;
  expectedResult: string;
  actualResult: string;
  remarks: string;
}

export function exportTestCaseReport(header: ReportHeader, rows: TestCaseReportRow[], entityType = 'TestCase'): void {
  const widths = [5, 14.9, 30, 20, 55, 16, 28, 18, 12, 13, 12, 14, 28];
  const last = widths.length; // 13 -> M
  const sheet = createSheet('Test Cases');
  widths.forEach((w, i) => sheet.colWidths.set(i + 1, w));

  const banner: CellStyle = { font: { size: 20, bold: true, color: 'FFFFFF' }, fill: TC.navy, align: { h: 'center', v: 'center', wrap: true } };
  mergeCells(sheet, 1, 1, 1, last, COMPANY, banner);
  sheet.rowHeights.set(1, 48);
  mergeCells(sheet, 2, 1, 2, last, 'Test Cases', {
    font: { size: 10, italic: true, color: TC.navy },
    fill: TC.paleBlue,
    align: { h: 'center', v: 'center' },
  });
  sheet.rowHeights.set(2, 21.75);
  mergeCells(sheet, 3, 1, 3, last, null, { fill: TC.blue });
  sheet.rowHeights.set(3, 4.5);
  sheet.rowHeights.set(4, 6);

  const label: CellStyle = { font: { size: 10, bold: true, color: TC.navy }, fill: TC.paleBlue, align: { h: 'left', v: 'center' } };
  const value: CellStyle = { font: { size: 10, color: TC.ink }, fill: 'FFFFFF', align: { h: 'left', v: 'center' }, border: { style: 'thin', color: TC.line } };
  const gap: CellStyle = { fill: TC.paleBlue };
  // Left block: project details. Right block: who prepared / reviewed /
  // approved the report, each with a date to sign off.
  const info = (row: number, left: [string, string], right: [string, string] | null, date: string) => {
    mergeCells(sheet, row, 1, row, 2, left[0], label);
    mergeCells(sheet, row, 3, row, 5, left[1], value);
    setCell(sheet, row, 6, null, gap);
    if (right) {
      setCell(sheet, row, 7, right[0], label);
      mergeCells(sheet, row, 8, row, 10, right[1], value);
      setCell(sheet, row, 11, 'Date :', label);
      mergeCells(sheet, row, 12, row, 13, date, value);
    } else {
      mergeCells(sheet, row, 7, row, 13, null, label);
    }
    sheet.rowHeights.set(row, 21.75);
  };
  info(5, ['Project Name :', header.projectName], ['Prepared By :', header.preparedBy], header.date);
  info(6, ['Project ID :', header.projectId], ['Reviewed By :', ''], '');
  info(7, ['Module Name :', header.moduleName], ['Approved By :', ''], '');
  info(8, ['Test Type :', header.testType], null, '');
  sheet.rowHeights.set(9, 6);

  mergeCells(sheet, 10, 1, 10, last, null, { fill: TC.blue });
  sheet.rowHeights.set(10, 4.5);
  mergeCells(sheet, 11, 1, 11, last, '  TEST CASE DETAILS', {
    font: { size: 10, bold: true, color: 'FFFFFF' },
    fill: TC.deepBlue,
    align: { h: 'left', v: 'center' },
  });
  sheet.rowHeights.set(11, 19.5);

  const headStyle: CellStyle = {
    font: { size: 9, bold: true, color: 'FFFFFF' },
    fill: TC.deepBlue,
    align: { h: 'center', v: 'center', wrap: true },
    border: { style: 'thin', color: TC.line },
  };
  [
    'S.\nNo.', 'Test Case\nID', 'Test Case\nObjective', 'Pre-\nCondition', 'Test Case Description\n(Steps)', 'Input\nData',
    'Expected\nResult', 'Actual\nResult', 'Iteration 1\nStatus', 'Iteration 1\nDate', 'Iteration 2\nStatus', 'Iteration 2\nDate', 'Remarks',
  ].forEach((text, i) => setCell(sheet, 12, i + 1, text, headStyle));
  sheet.rowHeights.set(12, 37.5);

  const cell: CellStyle = { font: { name: 'Times New Roman', size: 11 }, fill: 'FFFFFF', align: { h: 'left', v: 'center', wrap: true }, border: { style: 'thin', color: TC.line } };
  const top: CellStyle = { ...cell, align: { h: 'left', v: 'top', wrap: true } };
  // Iteration columns are filled in by hand after the run, so they are tinted.
  const iteration: CellStyle = { ...cell, fill: 'EFF6FF', align: { h: 'center', v: 'center', wrap: true } };
  const firstData = 13;
  const count = Math.max(rows.length, 10);
  for (let i = 0; i < count; i += 1) {
    const row = firstData + i;
    const r = rows[i];
    const values: CellValue[] = r
      ? [i + 1, r.id, r.objective, r.preCondition, r.steps, r.inputData, r.expectedResult, r.actualResult, '', '', '', '', r.remarks]
      : [i + 1, '', '', '', '', '', '', '', '', '', '', '', ''];
    values.forEach((v, c) => setCell(sheet, row, c + 1, v, c === 4 ? top : c >= 8 && c <= 11 ? iteration : cell));
    sheet.rowHeights.set(row, r ? rowHeight(values, widths, 36) : 24);
  }
  const lastData = firstData + count - 1;
  const statuses = ['Pass', 'Fail', 'In Progress', 'Blocked', 'Not Executed'];
  sheet.validations.push({ sqref: `I${firstData}:I${lastData}`, list: statuses });
  sheet.validations.push({ sqref: `K${firstData}:K${lastData}`, list: statuses });

  const spacer = lastData + 1;
  mergeCells(sheet, spacer, 1, spacer, last, null, { fill: TC.navy });
  sheet.rowHeights.set(spacer, 4);

  const totals = spacer + 1;
  const foot: CellStyle = { font: { size: 9, bold: true, color: 'FFFFFF' }, fill: TC.navy, align: { h: 'center', v: 'center' } };
  const green: CellStyle = { ...foot, fill: '166534' };
  const red: CellStyle = { ...foot, fill: '991B1B' };
  mergeCells(sheet, totals, 1, totals, 2, 'Total Test Cases:', { ...foot, align: { h: 'right', v: 'center' } });
  setCell(sheet, totals, 3, null, foot, `COUNTA(B${firstData}:B${lastData})`);
  mergeCells(sheet, totals, 4, totals, 5, 'Pass (Iteration 2):', { ...green, align: { h: 'right', v: 'center' } });
  setCell(sheet, totals, 6, null, green, `COUNTIF(K${firstData}:K${lastData},"Pass")`);
  mergeCells(sheet, totals, 7, totals, 8, 'Fail (Iteration 2):', { ...red, align: { h: 'right', v: 'center' } });
  setCell(sheet, totals, 9, null, red, `COUNTIF(K${firstData}:K${lastData},"Fail")`);
  mergeCells(sheet, totals, 10, totals, 12, 'In Progress / Blocked / Not Executed counted in Remarks column', { ...foot, font: { size: 8, color: '94A3B8' } });
  setCell(sheet, totals, 13, null, foot);
  sheet.rowHeights.set(totals, 21);

  mergeCells(sheet, totals + 1, 1, totals + 1, last, FOOTER, {
    font: { size: 8, italic: true, color: '94A3B8' },
    fill: '0F172A',
    align: { h: 'center', v: 'center' },
  });
  sheet.rowHeights.set(totals + 1, 18);

  sheet.freezeRow = 12;
  sheet.printTitleRow = 12;
  const filename = reportFilename('Test_Case_Report', header);
  downloadXlsx(filename, sheet);
  auditExport(entityType, filename, rows.length);
}

// ================================================================== Defect

const DF = {
  navy: '1F3864',
  gold: 'F4B942',
  blue: '2E75B6',
  pale: 'DCE6F5',
  line: 'BFBFBF',
};

export interface DefectReportRow {
  id: string;
  testCaseId: string;
  description: string;
  defectType: string;
  severity: string;
  assignedTo: string; // assigned by the project manager
  priority: string;
  engineerStatus: string;
  engineerRemarks: string;
  testerStatus: string;
  testerRemarks: string;
  closureDate: string;
}

export function exportDefectReport(header: ReportHeader, rows: DefectReportRow[], entityType = 'Defect'): void {
  const widths = [16.3, 16, 62.8, 16, 12, 18, 18.9, 14, 20, 14, 20, 14];
  const last = widths.length; // 12 -> L
  const sheet = createSheet('Defect-Report');
  widths.forEach((w, i) => sheet.colWidths.set(i + 1, w));

  mergeCells(sheet, 1, 1, 1, last, COMPANY, { font: { name: 'Arial', size: 20, bold: true, color: 'FFFFFF' }, fill: DF.navy, align: { h: 'center', v: 'center', wrap: true } });
  sheet.rowHeights.set(1, 36);
  mergeCells(sheet, 2, 1, 2, last, null, { fill: DF.gold });
  sheet.rowHeights.set(2, 7.95);
  mergeCells(sheet, 3, 1, 3, last, 'Defect Report', { font: { name: 'Arial', size: 14, bold: true, color: 'FFFFFF' }, fill: DF.blue, align: { h: 'center', v: 'center', wrap: true } });
  sheet.rowHeights.set(3, 24);
  sheet.rowHeights.set(4, 6);

  const left: CellStyle = { font: { name: 'Times New Roman', size: 11, bold: true, color: DF.navy }, align: { h: 'right', v: 'center' } };
  const field: CellStyle = { font: { name: 'Times New Roman', size: 11, bold: true, color: '000000' }, align: { h: 'left', v: 'center', wrap: true }, border: { style: 'thin', color: DF.line } };
  const dLabel: CellStyle = { font: { name: 'Times New Roman', size: 11, bold: true, color: DF.navy }, align: { h: 'center', v: 'center' } };
  const info = (row: number, name: string, value: string, who?: string, person?: string, date?: string) => {
    setCell(sheet, row, 1, name, left);
    mergeCells(sheet, row, 2, row, 6, value, field);
    if (who) {
      setCell(sheet, row, 7, who, left);
      mergeCells(sheet, row, 8, row, 9, person ?? '', field);
      setCell(sheet, row, 10, 'Date', dLabel);
      setCell(sheet, row, 11, date ?? '', field);
    }
    sheet.rowHeights.set(row, 18);
  };
  info(5, 'Project Name:', header.projectName);
  info(6, 'Project ID:', header.projectId, '  Prepared by:', header.preparedBy, header.date);
  info(7, 'Module Name:', header.moduleName, '  Reviewed by:', '', '');
  info(8, 'Test Type:', header.testType, 'Approved by:', '', '');
  sheet.rowHeights.set(9, 6);

  const head1: CellStyle = { font: { name: 'Times New Roman', size: 11, bold: true, color: 'FFFFFF' }, fill: DF.navy, align: { h: 'center', v: 'center', wrap: true }, border: { style: 'medium', color: DF.navy } };
  const head2: CellStyle = { font: { name: 'Times New Roman', size: 11, bold: true, color: 'FFFFFF' }, fill: DF.blue, align: { h: 'center', v: 'center', wrap: true }, border: { style: 'thin', color: DF.line } };
  [
    'Defect No.', 'Test Case ID', 'Defect Description', 'Defect Type', 'Severity', 'Assigned to\n(By PM)', 'Priority',
  ].forEach((text, i) => mergeCells(sheet, 10, i + 1, 11, i + 1, text, head1));
  mergeCells(sheet, 10, 8, 10, 9, 'Software Engg', head1);
  mergeCells(sheet, 10, 10, 10, 11, 'Test Engineer', head1);
  mergeCells(sheet, 10, 12, 11, 12, 'Closure Date', head1);
  setCell(sheet, 11, 8, 'Status', head2);
  setCell(sheet, 11, 9, 'Remarks', head2);
  setCell(sheet, 11, 10, 'Status', head2);
  setCell(sheet, 11, 11, 'Remarks', head2);
  sheet.rowHeights.set(10, 36);
  sheet.rowHeights.set(11, 22.05);

  const cell: CellStyle = { font: { name: 'Times New Roman', size: 11 }, fill: 'FFFFFF', align: { h: 'left', v: 'center', wrap: true }, border: { style: 'thin', color: DF.line } };
  const firstData = 12;
  const count = Math.max(rows.length, 10);
  for (let i = 0; i < count; i += 1) {
    const row = firstData + i;
    const r = rows[i];
    const fill = i % 2 === 1 ? 'F2F2F2' : 'FFFFFF';
    const left2: CellStyle = { ...cell, fill };
    const centered: CellStyle = { ...cell, fill, align: { h: 'center', v: 'center', wrap: true } };
    const values: CellValue[] = r
      ? [r.id, r.testCaseId, r.description, r.defectType, r.severity, r.assignedTo, r.priority, r.engineerStatus, r.engineerRemarks, r.testerStatus, r.testerRemarks, r.closureDate]
      : ['', '', '', '', '', '', '', '', '', '', '', ''];
    values.forEach((v, c) => setCell(sheet, row, c + 1, v, c === 2 || c === 8 || c === 10 ? left2 : centered));
    sheet.rowHeights.set(row, r ? rowHeight(values, widths, 36) : 24);
  }
  const footerRow = firstData + count + 1;
  mergeCells(sheet, footerRow, 1, footerRow, last - 1, DEFECT_FOOTER, { font: { name: 'Arial', size: 9, italic: true, color: '7F7F7F' }, align: { h: 'left', v: 'center', wrap: true } });

  sheet.freezeRow = 11;
  sheet.printTitleRow = 11;
  const filename = reportFilename('Defect_Report', header);
  downloadXlsx(filename, sheet);
  auditExport(entityType, filename, rows.length);
}

// ============================================================ Generic list

export interface ListReportSpec {
  title: string; // "Requirements Report"
  sheetName: string;
  tableTitle: string; // "REQUIREMENT DETAILS"
  filenamePrefix: string;
  entityType: string;
  idHeader?: string;
  columns: { header: string; width: number }[];
  rows: (string | number)[][];
}

// Requirements, Test Plans and Test Scenarios: QMICS banner + sign-off block,
// numbered table with the module's own columns, record count, footer.
export function exportListReport(header: ReportHeader, spec: ListReportSpec): void {
  const columns = [{ header: 'S.\nNo.', width: 5 }, ...spec.columns];
  const widths = columns.map((c) => c.width);
  const last = Math.max(columns.length, 8);
  const sheet = createSheet(spec.sheetName);
  for (let c = 1; c <= last; c += 1) sheet.colWidths.set(c, widths[c - 1] ?? 14);

  mergeCells(sheet, 1, 1, 1, last, COMPANY, { font: { size: 20, bold: true, color: 'FFFFFF' }, fill: TC.navy, align: { h: 'center', v: 'center', wrap: true } });
  sheet.rowHeights.set(1, 42);
  mergeCells(sheet, 2, 1, 2, last, spec.title, { font: { size: 10, italic: true, color: TC.navy }, fill: TC.paleBlue, align: { h: 'center', v: 'center' } });
  sheet.rowHeights.set(2, 21.75);
  mergeCells(sheet, 3, 1, 3, last, null, { fill: TC.blue });
  sheet.rowHeights.set(3, 4.5);
  sheet.rowHeights.set(4, 6);

  const label: CellStyle = { font: { size: 10, bold: true, color: TC.navy }, fill: TC.paleBlue, align: { h: 'left', v: 'center' } };
  const value: CellStyle = { font: { size: 10, color: TC.ink }, fill: 'FFFFFF', align: { h: 'left', v: 'center', wrap: true }, border: { style: 'thin', color: TC.line } };
  const info = (row: number, l1: string, v1: string, l2: string, v2: string) => {
    mergeCells(sheet, row, 1, row, 2, l1, label);
    mergeCells(sheet, row, 3, row, 4, v1, value);
    mergeCells(sheet, row, 5, row, 6, l2, label);
    mergeCells(sheet, row, 7, row, last, v2, value);
    sheet.rowHeights.set(row, 21.75);
  };
  info(5, 'Project Name :', header.projectName, 'Prepared By :', header.preparedBy);
  info(6, 'Project ID :', header.projectId, 'Date :', header.date);
  info(7, 'Module Name :', header.moduleName, 'Reviewed By :', '');
  info(8, 'Total Records :', String(spec.rows.length), 'Approved By :', '');
  sheet.rowHeights.set(9, 6);

  mergeCells(sheet, 10, 1, 10, last, null, { fill: TC.blue });
  sheet.rowHeights.set(10, 4.5);
  mergeCells(sheet, 11, 1, 11, last, `  ${spec.tableTitle}`, { font: { size: 10, bold: true, color: 'FFFFFF' }, fill: TC.deepBlue, align: { h: 'left', v: 'center' } });
  sheet.rowHeights.set(11, 19.5);

  const headStyle: CellStyle = { font: { size: 9, bold: true, color: 'FFFFFF' }, fill: TC.deepBlue, align: { h: 'center', v: 'center', wrap: true }, border: { style: 'thin', color: TC.line } };
  columns.forEach((c, i) => setCell(sheet, 12, i + 1, c.header, headStyle));
  sheet.rowHeights.set(12, 37.5);

  const cell: CellStyle = { font: { name: 'Times New Roman', size: 11 }, fill: 'FFFFFF', align: { h: 'left', v: 'center', wrap: true }, border: { style: 'thin', color: TC.line } };
  spec.rows.forEach((r, i) => {
    const row = 13 + i;
    const values: CellValue[] = [i + 1, ...r];
    values.forEach((v, c) => setCell(sheet, row, c + 1, v, cell));
    sheet.rowHeights.set(row, rowHeight(values, widths, 24));
  });

  const spacer = 13 + spec.rows.length;
  mergeCells(sheet, spacer, 1, spacer, last, null, { fill: TC.navy });
  sheet.rowHeights.set(spacer, 4);
  const totals = spacer + 1;
  mergeCells(sheet, totals, 1, totals, last, null, { font: { size: 9, bold: true, color: 'FFFFFF' }, fill: TC.navy, align: { h: 'left', v: 'center' } });
  setCell(sheet, totals, 1, `  Total ${spec.sheetName}: ${spec.rows.length}`, { font: { size: 9, bold: true, color: 'FFFFFF' }, fill: TC.navy, align: { h: 'left', v: 'center' } });
  sheet.rowHeights.set(totals, 21);
  mergeCells(sheet, totals + 1, 1, totals + 1, last, FOOTER, { font: { size: 8, italic: true, color: '94A3B8' }, fill: '0F172A', align: { h: 'center', v: 'center' } });
  sheet.rowHeights.set(totals + 1, 18);

  sheet.freezeRow = 12;
  sheet.printTitleRow = 12;
  const filename = reportFilename(spec.filenamePrefix, header);
  downloadXlsx(filename, sheet);
  auditExport(spec.entityType, filename, spec.rows.length);
}

export interface ColumnsReportSpec {
  title: string;
  sheetName: string;
  tableTitle: string;
  filenamePrefix: string;
  entityType: string;
}

// Turns a module's existing CSV column definitions into the QMICS report, so
// every module exports the same branded layout with its own columns.
export function exportColumnsReport<T>(
  header: ReportHeader,
  spec: ColumnsReportSpec,
  rows: T[],
  columns: CsvColumn<T>[],
): void {
  const text = (v: string | number | null | undefined): string | number =>
    v === null || v === undefined ? '' : v;
  const body = rows.map((row) => columns.map((column) => text(column.value(row))));
  const sized = columns.map((column, index) => {
    const sample = body.slice(0, 30).map((r) => String(r[index]).length);
    const typical = sample.length ? Math.max(...sample) : 0;
    const width = Math.min(48, Math.max(11, column.header.length + 3, Math.ceil(typical * 0.9)));
    return { header: column.header, width };
  });
  exportListReport(header, { ...spec, columns: sized, rows: body });
}
