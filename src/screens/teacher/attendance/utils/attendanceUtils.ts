import type { AttendanceStatus, RosterStudent } from '../../../../services/attendanceClient';

// The teacher's local calendar day (toISOString is UTC, which is still "yesterday" in India before 5:30 am).
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function attendanceStats(students: RosterStudent[]) {
  const stats = { present: 0, absent: 0, late: 0, unmarked: 0, total: students.length };
  for (const s of students) {
    if (s.status === 'present') stats.present += 1;
    else if (s.status === 'absent') stats.absent += 1;
    else if (s.status === 'late') stats.late += 1;
    else stats.unmarked += 1;
  }
  return stats;
}

// Tapping the current status again clears it.
export function toggleStatus(students: RosterStudent[], id: string, status: AttendanceStatus): RosterStudent[] {
  return students.map((s) => (s.id === id ? { ...s, status: s.status === status ? null : status } : s));
}

export function recordsOf(students: RosterStudent[]): Record<string, AttendanceStatus> {
  const records: Record<string, AttendanceStatus> = {};
  for (const s of students) if (s.status) records[s.id] = s.status;
  return records;
}

export function classKey(c: { grade: string; section: string }) {
  return `${c.grade}-${c.section}`;
}
