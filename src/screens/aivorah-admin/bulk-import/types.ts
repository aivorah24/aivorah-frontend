export interface BulkCreatePayload {
  students: string[];
  grade: string;
  section?: string;
  school: string;
  curriculum: string;
}

export interface CreatedStudent {
  name: string;
  email: string;
  password: string;
  grade: string;
  curriculum: string;
  section?: string;
  school: string;
}

export interface BulkCreateError {
  name: string;
  error: string;
}

export interface BulkCreateResult {
  created: CreatedStudent[];
  errors: BulkCreateError[];
  total: number;
}

// ── Spreadsheet import (POST /students/bulk-import) ──
export interface SpreadsheetImportPayload {
  schoolId: string;
  fileName: string;
  rows: Record<string, string>[];
}

export interface ImportCredential {
  name: string;
  email: string;
  password: string;
  role: string;
  grade?: string;
  section?: string;
}

export interface SpreadsheetImportResult {
  school: string;
  created: number;
  skipped: { row: number; name: string; email: string; reason: string }[];
  errors: { row: number; error: string }[];
  credentials: ImportCredential[];
}

// A spreadsheet row after column mapping and client-side checks; issues block the row, warnings don't.
export interface ReviewedRow {
  rowNum: number;
  values: Record<string, string>;
  issues: string[];
  warnings: string[];
}
