// What a teacher teaches - their saved teaches[] entries
// ({ curriculum, grade, subjects[] }) - as Library filters: only these grades,
// and per grade only these subjects. Subjects are typed free text in Settings
// ("Maths, science"), so they are matched loosely to the app's subject names.
import { SUBJECTS, gradeNumber } from '../constants';

export interface TeachesEntry { curriculum?: string; grade?: string; subjects?: string[] }

const ALIASES: Record<string, string> = {
  math: 'Mathematics', maths: 'Mathematics', mathematics: 'Mathematics',
  science: 'Science', sci: 'Science', evs: 'Science',
  english: 'English', 'english language': 'English', 'english literature': 'English',
  'social studies': 'Social Studies', 'social science': 'Social Studies', sst: 'Social Studies', 'unit of inquiry': 'Social Studies',
  'language acquisition': 'Language Acquisition', hindi: 'Language Acquisition', french: 'Language Acquisition', tamil: 'Language Acquisition', telugu: 'Language Acquisition',
  'visual arts': 'Visual Arts', art: 'Visual Arts', arts: 'Visual Arts',
  ict: 'ICT', computer: 'ICT', computers: 'ICT', 'computer science': 'ICT',
  'physical education': 'Physical Education', pe: 'Physical Education', sports: 'Physical Education',
};

/** 'maths ' -> 'Mathematics'; unknown names are kept as typed (trimmed). */
export function normalizeSubject(raw: string): string {
  const s = String(raw || '').trim();
  const key = s.toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[key] || SUBJECTS.find((x) => x.toLowerCase() === key) || s;
}

/** 'PYP 4' and 'Grade 4' are the same grade; other labels compare as text. */
export function sameGrade(a?: string | null, b?: string | null): boolean {
  const x = String(a || '').trim();
  const y = String(b || '').trim();
  if (!x || !y) return false;
  const nx = gradeNumber(x);
  const ny = gradeNumber(y);
  if (nx !== null && ny !== null && /\d/.test(x) && /\d/.test(y)) return nx === ny;
  return x.toLowerCase() === y.toLowerCase();
}

export interface TeacherScope {
  grades: string[];           // the teacher's grades, as saved
  subjects: string[];         // every subject they teach (normalised); [] = not set
  allows: (grade?: string | null, subject?: string | null) => boolean;
}

export function buildTeacherScope(teaches: TeachesEntry[] | null | undefined): TeacherScope {
  const entries = (Array.isArray(teaches) ? teaches : []).filter((t) => t && t.grade);
  const grades = [...new Set(entries.map((t) => String(t.grade).trim()))];
  const subjects = [...new Set(entries.flatMap((t) => (t.subjects || []).map(normalizeSubject)).filter(Boolean))];

  const allows = (grade?: string | null, subject?: string | null) => {
    // Nothing saved yet: nothing to restrict by.
    if (!entries.length) return true;
    const forGrade = entries.filter((t) => sameGrade(t.grade, grade));
    if (!forGrade.length) return false;
    const gradeSubjects = forGrade.flatMap((t) => (t.subjects || []).map(normalizeSubject));
    // A grade saved without subjects allows every subject of that grade.
    if (!gradeSubjects.length || !subject) return true;
    return gradeSubjects.includes(normalizeSubject(subject));
  };

  return { grades, subjects, allows };
}
