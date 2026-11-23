import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

const normalizeHeader = (h: unknown): string =>
  String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Parses an .xlsx, .xls, or .csv file into normalized header-keyed rows.
 * Automatically detects the header row even when metadata rows appear above it
 * (e.g. SunSystems Q&A Item Upload templates with headers on row 8).
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });
    if (matrix.length === 0) continue;

    // Scan up to first 25 rows for a header row containing Item Code or Description
    let headerIdx = matrix.findIndex((row, idx) => {
      if (idx > 25) return false;
      const norms = row.map(normalizeHeader);
      return norms.includes('itemcode') || (norms.includes('description') && norms.length >= 2);
    });
    if (headerIdx === -1) headerIdx = 0;

    const headerCells = matrix[headerIdx] || [];
    const headers = headerCells.map(normalizeHeader);
    if (headers.every((h) => !h)) continue;

    const rows: Record<string, string>[] = [];
    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const cells = matrix[i] || [];
      const rowObj: Record<string, string> = {};
      let hasValue = false;
      headers.forEach((h, colIdx) => {
        if (!h) return;
        const val = String(cells[colIdx] ?? '').trim();
        if (val) hasValue = true;
        rowObj[h] = val;
      });
      if (hasValue) rows.push(rowObj);
    }

    if (rows.length > 0) {
      return { headers, rows };
    }
  }

  return { headers: [], rows: [] };
}

export function pickCell(row: Record<string, string>, candidates: string[]): string {
  for (const key of candidates) {
    const val = row[key];
    if (val !== undefined && val !== '') return val;
  }
  return '';
}
