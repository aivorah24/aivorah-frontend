import { Platform } from 'react-native';

// Student roster import columns shared by the School Admin and Platform Admin importers.
export type StudentImportField =
  | 'studentName' | 'studentEmail' | 'admissionNo' | 'curriculum' | 'grade' | 'section'
  | 'parentName' | 'parentEmail' | 'parentPhone';

export type StudentImportRow = Record<StudentImportField, string>;

export const STUDENT_IMPORT_FIELDS: { value: StudentImportField; label: string }[] = [
  { value: 'studentName', label: 'Student Name' },
  { value: 'studentEmail', label: 'Student Email' },
  { value: 'admissionNo', label: 'Admission No' },
  { value: 'curriculum', label: 'Curriculum' },
  { value: 'grade', label: 'Grade' },
  { value: 'section', label: 'Section' },
  { value: 'parentName', label: 'Parent Name' },
  { value: 'parentEmail', label: 'Parent Email' },
  { value: 'parentPhone', label: 'Parent Phone' },
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyStudentRow(): StudentImportRow {
  return { studentName: '', studentEmail: '', admissionNo: '', curriculum: '', grade: '', section: '', parentName: '', parentEmail: '', parentPhone: '' };
}

// Quoted cells with commas and escaped quotes (""), CRLF/LF endings; fully-empty lines dropped.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Excel cells arrive as numbers/dates depending on how they were typed — force strings so it matches the CSV path.
export function xlsxToGrid(buffer: ArrayBuffer): string[][] {
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  return rows.map((row) => row.map((cell) => String(cell ?? '').trim()));
}

// Header text → field, so most spreadsheets need no manual mapping.
// Tolerates real-world variants: "Parent's Name", "Father Name", "Guardian Email ID", "Mother Mobile", "Class".
export function guessStudentField(header: string): StudentImportField | '' {
  const h = String(header || '').toLowerCase().replace(/['’]s\b/g, '').replace(/[^a-z0-9#]+/g, ' ').trim();
  if (!h) return '';
  const has = (re: RegExp) => re.test(h);
  const isEmail = has(/\b(e ?mail|mail)\b/);
  const isPhone = has(/\b(phone|mobile|mob|contact|whatsapp|cell|tel)\b/);

  if (has(/\b(parent|father|mother|guardian)\b/)) {
    if (isEmail) return 'parentEmail';
    if (isPhone) return 'parentPhone';
    return 'parentName';
  }
  if (has(/\badmission\b|\badm (no|number)\b/)) return 'admissionNo';
  if (has(/\b(curriculum|board|syllabus)\b/)) return 'curriculum';
  if (has(/\bsection\b|^sec$|\bdivision\b|^div$/)) return 'section';
  if (has(/\b(grade|class|std|standard)\b/)) return 'grade';
  if (isEmail) return 'studentEmail';
  if (has(/^(student|student name|name|full name|student full name|pupil name)$/)) return 'studentName';
  return '';
}

export function csvEscape(value: string): string {
  const v = value ?? '';
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadBlob(filename: string, blob: Blob) {
  if (Platform.OS !== 'web') return;
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // non-web / restricted environments
  }
}

export function downloadCsv(filename: string, content: string) {
  downloadBlob(filename, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}

// A ready-to-fill .xlsx with the given header row (plus optional example rows), widths sized to the headers.
export function downloadXlsxTemplate(filename: string, headers: string[], examples: string[][] = []) {
  const XLSX = require('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const out: ArrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(filename, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
