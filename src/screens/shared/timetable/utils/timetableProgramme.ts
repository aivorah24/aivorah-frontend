// IB programme grouping: PYP (Grade 1-5), MYP (6-10), DP (11-12). Only applied
// when the school's base curriculum is IB — mirrors resolveCurriculum() on the
// server. Non-IB schools skip the programme row and use a flat grade list.
export const PROG_ORDER = ['PYP', 'MYP', 'DP'];

export interface StructureGrade {
  name: string;
  sections: string[];
}

export function programmeForGrade(name: string, isIB: boolean): string | null {
  if (!isIB) return null;
  const n = parseInt(String(name).replace(/\D/g, ''), 10);
  if (!n) return 'PYP';
  if (n <= 5) return 'PYP';
  if (n <= 10) return 'MYP';
  return 'DP';
}

export function computeProgrammes(structure: StructureGrade[], isIB: boolean): string[] {
  return isIB
    ? PROG_ORDER.filter((p) => structure.some((g) => programmeForGrade(g.name, isIB) === p))
    : [];
}

export function computeActiveProgramme(
  programme: string | null,
  selectedGrade: string | null,
  isIB: boolean,
  programmes: string[],
): string | null {
  return programme || (selectedGrade ? programmeForGrade(selectedGrade, isIB) : null) || programmes[0] || null;
}

export function computeGradesForSelector(structure: StructureGrade[], isIB: boolean, activeProgramme: string | null): StructureGrade[] {
  return isIB
    ? structure.filter((g) => programmeForGrade(g.name, isIB) === activeProgramme)
    : structure;
}

export function computeSectionsForGrade(structure: StructureGrade[], selectedGrade: string | null): string[] {
  return selectedGrade ? (structure.find((g) => g.name === selectedGrade)?.sections || []) : [];
}
