import { EMAIL_RE, emptyStudentRow, type StudentImportField } from '../../../../utils/spreadsheet';
import { getGradesForCurriculum } from '../../../school-admin/teachers/utils/teachingEntries';
import { normalizeGrade, normalizeCurriculum, curriculaForBoard } from '../../shared/academicLabels';
import type { ReviewedRow } from '../types';

// Applies the column mapping to each data row, normalises grade/curriculum labels
// (so "5"/"PYP 5"/NCERT land as "Grade 5"/CBSE), and flags problems before upload.
export function reviewRows(
  dataRows: string[][],
  columnMap: (StudentImportField | '')[],
  schoolBoard: string | null,
): ReviewedRow[] {
  const allowed = curriculaForBoard(schoolBoard);
  const seenEmails = new Map<string, number>();

  return dataRows.map((cells, i) => {
    const v: Record<string, string> = emptyStudentRow();
    columnMap.forEach((field, col) => { if (field) v[field] = String(cells[col] ?? '').trim(); });
    v.grade = normalizeGrade(v.grade);
    v.curriculum = normalizeCurriculum(v.curriculum);
    v.studentEmail = v.studentEmail.toLowerCase();
    v.parentEmail = v.parentEmail.toLowerCase();

    const rowNum = i + 1;
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!v.studentName) issues.push('Student Name is missing');
    if (v.studentEmail && !EMAIL_RE.test(v.studentEmail)) issues.push(`"${v.studentEmail}" is not a valid email`);
    if (v.parentEmail && !EMAIL_RE.test(v.parentEmail)) issues.push(`Parent email "${v.parentEmail}" is not valid`);
    if (v.studentEmail && seenEmails.has(v.studentEmail)) issues.push(`Same email as row ${seenEmails.get(v.studentEmail)}`);
    else if (v.studentEmail) seenEmails.set(v.studentEmail, rowNum);

    if (v.curriculum && allowed && !allowed.includes(v.curriculum)) {
      warnings.push(`${v.curriculum} isn't one of this school's curricula (${allowed.join(', ')})`);
    }
    if (v.curriculum && /^Grade \d+$/.test(v.grade) && !getGradesForCurriculum(v.curriculum).includes(v.grade)) {
      warnings.push(`${v.grade} is outside the ${v.curriculum} grade range`);
    }
    if (!v.parentName && (v.parentEmail || v.parentPhone)) warnings.push('Parent email/phone is ignored without a Parent Name');
    if (!v.studentEmail && v.studentName) warnings.push('No email — a login will be generated');

    return { rowNum, values: v, issues, warnings };
  });
}
