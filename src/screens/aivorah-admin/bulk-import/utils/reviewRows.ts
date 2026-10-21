import { EMAIL_RE, emptyStudentRow, type StudentImportField } from '../../../../utils/spreadsheet';
import { getGradesForCurriculum } from '../../../school-admin/teachers/utils/teachingEntries';
import { normalizeGrade, normalizeCurriculum, curriculaForBoard, resolveCurriculum } from '../../shared/academicLabels';
import type { ReviewedRow } from '../types';

// Applies the column mapping to each data row, normalises grade labels ("5"/"PYP 5" → "Grade 5"),
// and flags problems before upload. Curriculum always comes from the school's board; a spreadsheet
// curriculum column (sheetCurriculumCol) is only read to warn when it disagrees.
export function reviewRows(
  dataRows: string[][],
  columnMap: (StudentImportField | '')[],
  schoolBoard: string | null,
  sheetCurriculumCol = -1,
  includeParents = true,
): ReviewedRow[] {
  const seenEmails = new Map<string, number>();

  return dataRows.map((cells, i) => {
    const v: Record<string, string> = emptyStudentRow();
    delete v.curriculum;
    columnMap.forEach((field, col) => { if (field && field !== 'curriculum') v[field] = String(cells[col] ?? '').trim(); });
    if (!includeParents) { v.parentName = ''; v.parentEmail = ''; v.parentPhone = ''; }
    v.grade = normalizeGrade(v.grade);
    v.studentEmail = v.studentEmail.toLowerCase();
    v.parentEmail = v.parentEmail.toLowerCase();
    const curriculum = resolveCurriculum(schoolBoard, v.grade);
    const sheetCurriculum = sheetCurriculumCol >= 0 ? normalizeCurriculum(String(cells[sheetCurriculumCol] ?? '')) : '';

    const rowNum = i + 1;
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!v.studentName) issues.push('Student Name is missing');
    if (v.studentEmail && !EMAIL_RE.test(v.studentEmail)) issues.push(`"${v.studentEmail}" is not a valid email`);
    if (v.parentEmail && !EMAIL_RE.test(v.parentEmail)) issues.push(`Parent email "${v.parentEmail}" is not valid`);
    if (v.studentEmail && seenEmails.has(v.studentEmail)) issues.push(`Same email as row ${seenEmails.get(v.studentEmail)}`);
    else if (v.studentEmail) seenEmails.set(v.studentEmail, rowNum);

    if (sheetCurriculum && !curriculum) {
      warnings.push(`Spreadsheet says ${sheetCurriculum} — choose the school's curriculum above`);
    } else if (sheetCurriculum && curriculum && !curriculaForBoard(sheetCurriculum)?.includes(curriculum)) {
      warnings.push(`Spreadsheet says ${sheetCurriculum} — will use ${curriculum}`);
    }
    if (curriculum && /^Grade \d+$/.test(v.grade) && !getGradesForCurriculum(curriculum).includes(v.grade)) {
      warnings.push(`${v.grade} is outside the ${curriculum} grade range`);
    }
    if (!v.parentName && (v.parentEmail || v.parentPhone)) warnings.push('Parent email/phone is ignored without a Parent Name');
    if (!v.studentEmail && v.studentName) warnings.push('No email — a login will be generated');

    return { rowNum, values: v, curriculum, issues, warnings };
  });
}
