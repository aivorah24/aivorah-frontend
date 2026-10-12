import { DEMO_STUDENTS, INACTIVE_DAYS } from '../constants';
import type { Student, StudentStats, Teaches } from '../types';
import { resolveStudentStatus } from '../../../../utils/studentStatus';

// A student counts as "inactive" only if they have ALREADY engaged at least
// once (a real last-active date) and haven't returned in 3+ days. A freshly
// added student who has never logged in is NOT inactive — otherwise every new
// student shows up under Inactive the moment the teacher adds them. Never-active
// students that linger are surfaced via "Needs Attention" instead (after its own
// grace window), so the two buckets don't both fire on brand-new accounts.
export function isInactiveStudent(s: Student): boolean {
  if (!s.lastActive) return false; // never engaged yet → not "inactive"
  const days = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 86400000);
  return days >= INACTIVE_DAYS;
}

export function deriveStudentsForTeacher(teaches: Teaches[]): Student[] {
  if (!teaches || teaches.length === 0) return [];
  return DEMO_STUDENTS.filter(s =>
    teaches.some(t => t.grade === s.grade && t.curriculum === s.curriculum)
  );
}

export function filterStudents(
  students: Student[],
  search: string,
  activeTab: string,
  todayISO: string,
): Student[] {
  return students.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      activeTab === 'All'             ? true :
      activeTab === 'Needs Attention' ? resolveStudentStatus(s) === 'needs_attention' :
      activeTab === 'Active Today'    ? s.lastActive?.startsWith(todayISO) :
      activeTab === 'Inactive'        ? isInactiveStudent(s) :
      activeTab === 'Streak Risk'     ? (s.currentStreak || 0) === 1 :
      activeTab === 'Top Performers'  ? (s.progressPct || 0) >= 50 :
      s.grade === activeTab;
    return matchSearch && matchTab;
  });
}

// Build grade tabs dynamically from actual student data
export function buildGradeTabs(students: Student[]): string[] {
  return ['All', ...Array.from(new Set(students.map(s => s.grade))).sort(), 'Needs Attention', 'Active Today', 'Inactive', 'Streak Risk', 'Top Performers'];
}

export function computeStats(students: Student[], todayISO: string): StudentStats {
  return {
    total: students.length,
    onTrack: students.filter(s => ['on_track', 'excelling'].includes(resolveStudentStatus(s))).length,
    attention: students.filter(s => resolveStudentStatus(s) === 'needs_attention').length,
    activeToday: students.filter(s => s.lastActive?.startsWith(todayISO)).length,
    inactive: students.filter(isInactiveStudent).length,
    streakRisk: students.filter(s => (s.currentStreak || 0) === 1).length,
    topPerformers: students.filter(s => (s.progressPct || 0) >= 50).length,
    avgProgress: students.length
      ? Math.round(students.reduce((a, s) => a + s.progressPct, 0) / students.length)
      : 0,
  };
}
