// Minimal, dependency-free .xlsx writer (one worksheet, styles, merged cells,
// column widths, row heights, formulas, frozen rows, print setup). It exists
// so the QMICS report templates can be produced in the browser without
// adding a spreadsheet library to the app.

export interface CellStyle {
  font?: { name?: string; size?: number; bold?: boolean; italic?: boolean; color?: string };
  fill?: string;
  align?: { h?: 'left' | 'center' | 'right'; v?: 'top' | 'center' | 'bottom'; wrap?: boolean };
  border?: { style: 'thin' | 'medium'; color: string };
}

export type CellValue = string | number | null | undefined;

interface SheetCell {
  r: number;
  c: number;
  value?: CellValue;
  formula?: string;
  style?: CellStyle;
}

export interface Sheet {
  name: string;
  cells: Map<string, SheetCell>;
  colWidths: Map<number, number>;
  rowHeights: Map<number, number>;
  merges: string[];
  freezeRow: number | null;
  printTitleRow: number | null;
}

export function createSheet(name: string): Sheet {
  return {
    name,
    cells: new Map(),
    colWidths: new Map(),
    rowHeights: new Map(),
    merges: [],
    freezeRow: null,
    printTitleRow: null,
  };
}

export function colLetter(col: number): string {
  let n = col;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function ref(row: number, col: number): string {
  return `${colLetter(col)}${row}`;
}

export function setCell(
  sheet: Sheet,
  row: number,
  col: number,
  value: CellValue,
  style?: CellStyle,
  formula?: string,
): void {
  sheet.cells.set(ref(row, col), { r: row, c: col, value, style, formula });
}

// Writes a value into the top-left cell of a merged block and styles every
// cell in the block so fills/borders render across the whole merged area.
export function mergeCells(
  sheet: Sheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  value: CellValue,
  style?: CellStyle,
  formula?: string,
): void {
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      const isOrigin = r === r1 && c === c1;
      setCell(sheet, r, c, isOrigin ? value : null, style, isOrigin ? formula : undefined);
    }
  }
  if (r1 !== r2 || c1 !== c2) sheet.merges.push(`${ref(r1, c1)}:${ref(r2, c2)}`);
}

// ---------------------------------------------------------------- styles --

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

interface StyleTables {
  xml: string;
  indexOf: (style: CellStyle | undefined) => number;
}

function buildStyles(sheet: Sheet): StyleTables {
  const fonts: string[] = ['<font><sz val="11"/><name val="Calibri"/></font>'];
  const fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const borders: string[] = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  const xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const xfIndex = new Map<string, number>();

  const intern = (list: string[], xml: string): number => {
    const found = list.indexOf(xml);
    if (found >= 0) return found;
    list.push(xml);
    return list.length - 1;
  };

  const indexOf = (style: CellStyle | undefined): number => {
    if (!style) return 0;
    const key = JSON.stringify(style);
    const cached = xfIndex.get(key);
    if (cached !== undefined) return cached;

    const f = style.font ?? {};
    const fontXml =
      '<font>' +
      (f.bold ? '<b/>' : '') +
      (f.italic ? '<i/>' : '') +
      `<sz val="${f.size ?? 11}"/>` +
      (f.color ? `<color rgb="${argb(f.color)}"/>` : '') +
      `<name val="${escapeXml(f.name ?? 'Calibri')}"/>` +
      '</font>';
    const fontId = intern(fonts, fontXml);

    const fillId = style.fill
      ? intern(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(style.fill)}"/><bgColor indexed="64"/></patternFill></fill>`)
      : 0;

    let borderId = 0;
    if (style.border) {
      const side = (name: string) =>
        `<${name} style="${style.border!.style}"><color rgb="${argb(style.border!.color)}"/></${name}>`;
      borderId = intern(borders, `<border>${side('left')}${side('right')}${side('top')}${side('bottom')}<diagonal/></border>`);
    }

    const a = style.align;
    const alignXml = a
      ? `<alignment${a.h ? ` horizontal="${a.h}"` : ''}${a.v ? ` vertical="${a.v}"` : ''}${a.wrap ? ' wrapText="1"' : ''}/>`
      : '';
    const xf =
      `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      ' applyFont="1"' +
      (fillId ? ' applyFill="1"' : '') +
      (borderId ? ' applyBorder="1"' : '') +
      (alignXml ? ' applyAlignment="1">' + alignXml + '</xf>' : '/>');
    xfs.push(xf);
    const index = xfs.length - 1;
    xfIndex.set(key, index);
    return index;
  };

  // Register every style used so the tables are complete before serialising.
  sheet.cells.forEach((cell) => {
    indexOf(cell.style);
  });

  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts>` +
    `<fills count="${fills.length}">${fills.join('')}</fills>` +
    `<borders count="${borders.length}">${borders.join('')}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';
  return { xml, indexOf };
}

// ----------------------------------------------------------------- sheet --

function buildSheetXml(sheet: Sheet, styleIndex: (s: CellStyle | undefined) => number): string {
  let maxRow = 1;
  let maxCol = 1;
  sheet.cells.forEach((cell) => {
    if (cell.r > maxRow) maxRow = cell.r;
    if (cell.c > maxCol) maxCol = cell.c;
  });

  const byRow = new Map<number, SheetCell[]>();
  sheet.cells.forEach((cell) => {
    const list = byRow.get(cell.r) ?? [];
    list.push(cell);
    byRow.set(cell.r, list);
  });

  const rowsXml: string[] = [];
  for (let r = 1; r <= maxRow; r += 1) {
    const cells = (byRow.get(r) ?? []).sort((a, b) => a.c - b.c);
    const height = sheet.rowHeights.get(r);
    if (cells.length === 0 && height === undefined) continue;
    const cellsXml = cells
      .map((cell) => {
        const s = styleIndex(cell.style);
        const sAttr = s ? ` s="${s}"` : '';
        const address = ref(cell.r, cell.c);
        if (cell.formula) {
          return `<c r="${address}"${sAttr}><f>${escapeXml(cell.formula)}</f></c>`;
        }
        const v = cell.value;
        if (v === null || v === undefined || v === '') return `<c r="${address}"${sAttr}/>`;
        if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${address}"${sAttr}><v>${v}</v></c>`;
        return `<c r="${address}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(v))}</t></is></c>`;
      })
      .join('');
    rowsXml.push(`<row r="${r}"${height !== undefined ? ` ht="${height}" customHeight="1"` : ''}>${cellsXml}</row>`);
  }

  const colsXml = [...sheet.colWidths.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([c, w]) => `<col min="${c}" max="${c}" width="${w}" customWidth="1"/>`)
    .join('');

  const pane =
    sheet.freezeRow !== null
      ? `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>` +
        `<selection pane="bottomLeft" activeCell="A${sheet.freezeRow + 1}" sqref="A${sheet.freezeRow + 1}"/>`
      : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:${ref(maxRow, maxCol)}"/>` +
    `<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>` +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    (colsXml ? `<cols>${colsXml}</cols>` : '') +
    `<sheetData>${rowsXml.join('')}</sheetData>` +
    (sheet.merges.length
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '') +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    '</worksheet>'
  );
}

// ------------------------------------------------------------------- zip --

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function zipStore(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + name.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 33, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(entry.data, 30 + name.length);
    locals.push(local);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);

    offset += local.length;
  });

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let pos = 0;
  [...locals, ...centrals, end].forEach((part) => {
    out.set(part, pos);
    pos += part.length;
  });
  return out;
}

// ---------------------------------------------------------------- public --

export function buildXlsx(sheet: Sheet): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const styles = buildStyles(sheet);
  const sheetName = escapeXml(sheet.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));

  const printTitles =
    sheet.printTitleRow !== null
      ? `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'${sheetName}'!$${sheet.printTitleRow}:$${sheet.printTitleRow}</definedName></definedNames>`
      : '';

  const files: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          '</Types>',
      ),
    },
    {
      name: '_rels/.rels',
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>` +
          printTitles +
          '<calcPr fullCalcOnLoad="1"/>' +
          '</workbook>',
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: encoder.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
          '</Relationships>',
      ),
    },
    { name: 'xl/styles.xml', data: encoder.encode(styles.xml) },
    { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(buildSheetXml(sheet, styles.indexOf)) },
  ];

  return zipStore(files);
}

export function downloadXlsx(filename: string, sheet: Sheet): void {
  const bytes = buildXlsx(sheet);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
