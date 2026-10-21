import { EMAIL_RE } from '../../../../utils/spreadsheet';
import type { TeacherImportField, ReviewedTeacherRow } from '../types';

export const TEACHER_IMPORT_FIELDS: { value: TeacherImportField; label: string }[] = [
  { value: 'teacherName', label: 'Teacher Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'grade', label: 'Grade' },
  { value: 'subjects', label: 'Subjects' },
];

export function guessTeacherField(header: string): TeacherImportField | '' {
  const h = String(header || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (/\b(e ?mail|mail)\b/.test(h)) return 'email';
  if (/\b(phone|mobile|mob|contact|whatsapp|cell)\b/.test(h)) return 'phone';
  if (/\bsubjects?\b/.test(h)) return 'subjects';
  if (/\b(grades?|class(es)?|std|standard)\b/.test(h)) return 'grade';
  if (/^(teacher|teacher name|name|full name|teacher full name|staff name)$/.test(h)) return 'teacherName';
  return '';
}

// "5" / "PYP 5" / "Class 5" → "Grade 5"; "|" keeps separate per-grade groups.
function normalizeGrades(raw: string) {
  return raw.split('|').map((g) => {
    const t = g.trim();
    const n = t.match(/\d{1,2}/);
    return n ? `Grade ${parseInt(n[0], 10)}` : t;
  }).filter(Boolean).join(' | ');
}

export function reviewTeacherRows(dataRows: string[][], columnMap: (TeacherImportField | '')[]): ReviewedTeacherRow[] {
  const seen = new Map<string, number>();
  return dataRows.map((cells, i) => {
    const v: Record<TeacherImportField, string> = { teacherName: '', email: '', phone: '', grade: '', subjects: '' };
    columnMap.forEach((field, col) => { if (field) v[field] = String(cells[col] ?? '').trim(); });
    v.email = v.email.toLowerCase();
    v.grade = normalizeGrades(v.grade);
    const rowNum = i + 1;
    const issues: string[] = [];
    const warnings: string[] = [];
    if (!v.teacherName) issues.push('Teacher Name is missing');
    if (v.email && !EMAIL_RE.test(v.email)) issues.push(`"${v.email}" is not a valid email`);
    if (v.email && seen.has(v.email)) warnings.push(`Same email as row ${seen.get(v.email)} — merged into one teacher`);
    else if (v.email) seen.set(v.email, rowNum);
    const gradeGroups = v.grade ? v.grade.split('|').length : 0;
    const subjectGroups = v.subjects ? v.subjects.split('|').length : 0;
    if (gradeGroups > 1 && subjectGroups > 1 && gradeGroups !== subjectGroups) issues.push(`${gradeGroups} grade groups but ${subjectGroups} subject groups`);
    if (!v.grade) warnings.push('No grade — can be assigned later');
    if (!v.email && v.teacherName) warnings.push('No email — a login will be generated');
    return { rowNum, values: v, issues, warnings };
  });
}
