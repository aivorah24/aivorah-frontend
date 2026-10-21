import { normalizeCurriculum } from '../../../../utils/curriculum';

export interface ChildEntry {
  key: string;
  admissionNumber: string;
  name: string;
  curriculum: string;
  grade: string;
  section: string;
}

export interface ChildPayloadEntry {
  admissionNumber?: string;
  name?: string;
  grade?: string;
  section?: string;
}

const CURRICULA = ['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge'];

export function newChildEntry(): ChildEntry {
  return { key: `${Date.now()}-${Math.random()}`, admissionNumber: '', name: '', curriculum: '', grade: '', section: '' };
}

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

// Only rows the admin actually filled in — a blank leftover "Add another
// child" row shouldn't count as a failed match.
export function childrenToPayload(children: ChildEntry[]): ChildPayloadEntry[] {
  return children
    .filter((c) => c.admissionNumber.trim() || c.name.trim())
    .map((c) => ({
      admissionNumber: c.admissionNumber.trim() || undefined,
      name: c.name.trim() || undefined,
      grade: c.grade.trim() || undefined,
      section: c.section.trim() || undefined,
    }));
}
