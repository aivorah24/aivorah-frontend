import { normalizeCurriculum } from '../../../../utils/curriculum';

export type TeachingEntry = { curriculum: string; grade: string; subjectsInput: string };

const CURRICULA = ['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge'];

export function getGradesForCurriculum(curr: string): string[] {
  if (curr === 'IB PYP') return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  if (curr === 'IB MYP') return ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  if (curr === 'IB DP') return ['Grade 11', 'Grade 12'];
  return ['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
}

export function curriculaForBase(rawBase: string | null): string[] {
  const base = normalizeCurriculum(rawBase) ?? null;
  if (base === 'IB') return ['IB PYP', 'IB MYP', 'IB DP'];
  if (base && CURRICULA.includes(base)) return [base];
  return CURRICULA;
}

export function defaultCurriculumForBase(rawBase: string | null): string {
  const base = normalizeCurriculum(rawBase);
  if (!base) return '';
  return CURRICULA.includes(base) ? base : '';
}

export function emptyEntry(defaultCurriculum = ''): TeachingEntry {
  return { curriculum: defaultCurriculum, grade: '', subjectsInput: '' };
}

function gradeNum(grade: string): number {
  const m = grade.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

export function getSubjectsForEntry(curriculum: string, grade: string): string[] {
  if (curriculum === 'IB PYP') return ['English', 'Mathematics', 'Science', 'Social Studies', 'Arts', 'Physical Education', 'PSPE'];
  if (curriculum === 'IB MYP') return ['Language & Literature', 'Language Acquisition', 'Individuals & Societies', 'Sciences', 'Mathematics', 'Arts', 'Physical & Health Education', 'Design'];
  if (curriculum === 'IB DP') return ['Language & Literature', 'Language Acquisition', 'Individuals & Societies', 'Sciences', 'Mathematics', 'The Arts', 'Theory of Knowledge'];
  if (curriculum === 'Cambridge') return ['English', 'Mathematics', 'Science', 'Global Perspectives', 'ICT', 'Art & Design'];
  if (curriculum === 'CBSE' || curriculum === 'ICSE') {
    const n = gradeNum(grade);
    if (!grade || n <= 5) return ['English', 'Mathematics', 'EVS', 'Hindi', 'Art', 'Physical Education'];
    if (n >= 11) {
      return [
        'English', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science',
        'Accountancy', 'Business Studies', 'Economics',
        'History', 'Political Science', 'Geography', 'Psychology', 'Sociology',
        'Physical Education',
      ];
    }
    return ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'ICT', 'Art', 'Physical Education'];
  }
  return ['English', 'Mathematics', 'Science', 'Social Studies'];
}

export function entriesToTeaches(entries: TeachingEntry[]): { curriculum: string; grade: string; subjects: string[] }[] {
  return entries
    .filter((e) => e.curriculum && e.grade)
    .map((e) => ({
      curriculum: e.curriculum,
      grade: e.grade,
      subjects: e.subjectsInput.split(/[;,]/).map((s) => s.trim()).filter(Boolean),
    }));
}
