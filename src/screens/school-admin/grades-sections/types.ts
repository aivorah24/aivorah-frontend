export interface SectionRow {
  name: string;
  archived: boolean;
  studentCount: number;
}

export interface GradeRow {
  name: string;
  archived: boolean;
  sections: SectionRow[];
  unassignedCount: number;
  totalStudents: number;
}

export type PromptState =
  | { kind: 'addGrade' }
  | { kind: 'addSection'; grade: string }
  | { kind: 'renameGrade'; grade: string }
  | null;
