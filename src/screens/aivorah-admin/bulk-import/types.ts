export interface BulkCreatePayload {
  students: string[];
  grade: string;
  section?: string;
  schoolId: string;
  school: string;
  curriculum?: string; // only when the school has none — saved to it
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
  curriculum?: string; // only when the school has none — saved to it
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
// `curriculum` is the school's (resolved by grade) — never sent; the server resolves it too.
export interface ReviewedRow {
  rowNum: number;
  values: Record<string, string>;
  curriculum: string | null;
  issues: string[];
  warnings: string[];
}

// ── Teacher spreadsheet import (POST /teachers/bulk-import) ──
export type TeacherImportField = 'teacherName' | 'email' | 'phone' | 'grade' | 'subjects';

export interface ReviewedTeacherRow {
  rowNum: number;
  values: Record<TeacherImportField, string>;
  issues: string[];
  warnings: string[];
}

export interface TeacherImportPayload {
  schoolId: string;
  fileName: string;
  rows: Record<TeacherImportField, string>[];
}

export interface TeacherImportResult {
  school: string;
  created: number;
  skipped: { row: number; name: string; email: string; reason: string }[];
  errors: { row: number; error: string }[];
  credentials: (ImportCredential & { subjects?: string[] })[];
}
