import * as XLSX from 'npm:xlsx@0.18.5';

export interface WorksheetData {
  [key: string]: any;
}

export function parseExcelFile(buffer: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: 'array' });
}

export function getWorksheetData(workbook: XLSX.WorkBook, sheetIndex: number = 0): WorksheetData[] {
  const sheetName = workbook.SheetNames[sheetIndex];
  if (!sheetName) {
    throw new Error(`Sheet at index ${sheetIndex} not found`);
  }

  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: null });
}

export function getCellValue(row: WorksheetData, column: string): any {
  return row[column] !== undefined && row[column] !== null ? row[column] : null;
}

export function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = typeof value === 'number' ? value : parseFloat(value.toString().replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

export function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = typeof value === 'number' ? Math.floor(value) : parseInt(value.toString());
  return isNaN(parsed) ? null : parsed;
}
