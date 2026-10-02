import { trRequest, trPostFile } from '../../../../services/timetableResourcesClient';

export interface PeriodDef {
  code: string;      // 'P0', 'P1', 'BRK', 'LUNCH', ...
  start: string;     // '08:25'
  end: string;       // '08:50'
  isBreak: boolean;
}

export interface TimetableSlot {
  id: string;
  day: string;       // 'MON'..'SAT'
  periodCode: string;
  subject: string | null;
  room: string | null;
  teacherId: string | null;
  teacherName: string | null;
  materialUrl: string | null;
  materialName: string | null;
  color: string | null;
}

export interface Timetable {
  grade: string;
  section: string;
  title: string;
  periodDefs: PeriodDef[];
  days: string[];
  slots: TimetableSlot[];
  permissions: { canManageTemplate: boolean; canEditSlot: boolean };
}

export interface TimetableClass {
  grade: string;
  section: string;
  label: string;
  homeroom?: boolean;
  studentName?: string;
}

export interface StructureGrade { name: string; sections: string[] }

export interface TimetableClasses {
  classes: TimetableClass[];
  grades: StructureGrade[];
  curriculum: string | null;
}

export function fetchClasses(): Promise<TimetableClasses> {
  return trRequest<TimetableClasses>('/timetable/classes', {}, 'Failed to load classes');
}

export function fetchTimetable(grade: string, section: string): Promise<Timetable> {
  const q = new URLSearchParams({ grade, section: section || '' });
  return trRequest<Timetable>(`/timetable?${q}`, {}, 'Failed to load timetable');
}

export async function saveTemplate(body: { grade: string; section: string; title?: string; periodDefs: PeriodDef[] }): Promise<void> {
  await trRequest('/timetable/template', { method: 'PUT', body }, 'Failed to save the bell schedule');
}

export async function saveSlot(body: {
  grade: string; section: string; day: string; periodCode: string;
  subject?: string; room?: string; materialUrl?: string | null; materialName?: string | null; color?: string | null;
}): Promise<void> {
  await trRequest('/timetable/slot', { method: 'PUT', body }, 'Failed to save the slot');
}

export interface ImportSlot {
  day: string; periodCode: string; subject: string; room: string; teacherName?: string; teacherId: string | null;
}

export interface ImportedClass {
  label: string;
  homeroomTeacher: string;
  match: { grade: string; section: string } | null;
  matchReason: string | null;
  canSave: boolean;
  periodDefs: PeriodDef[];
  slots: ImportSlot[];
  warnings: string[];
}

export interface ImportResult { grade: string; section: string; ok: boolean; error?: string; periods?: number; slots?: number }

// Reads every class timetable in a PDF; nothing is saved yet.
export function previewTimetableImport(file: Blob, fileName: string): Promise<{ fileName: string; classes: ImportedClass[] }> {
  return trPostFile('/timetable/import/preview', file, fileName, 'Could not read the timetable PDF');
}

// Replaces the periods and subjects of each confirmed class.
export function commitTimetableImport(timetables: { grade: string; section: string; periodDefs: PeriodDef[]; slots: ImportSlot[] }[]): Promise<{ results: ImportResult[]; saved: number }> {
  return trRequest('/timetable/import/commit', { method: 'POST', body: { timetables } }, 'Failed to save the timetables');
}

// 'HH:MM' (24h) → '8:25 am' style used in the cards/popup.
export function fmtTime(hhmm: string): string {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return hhmm || '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export const DAY_LABELS: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat',
};

// Stable pastel fill per subject (Toddle-style). Deterministic hash → palette,
// so the same subject always gets the same colour across the grid.
export const SUBJECT_PALETTE = ['#E0F7FA', '#E8E4F5', '#FCE4EC', '#FFF9C4', '#E8F5E9', '#FFF3E0', '#E3F2FD', '#F3E5F5'];
export function subjectColor(subject: string | null): string {
  if (!subject) return 'transparent';
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}
