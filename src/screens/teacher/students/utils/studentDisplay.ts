import { AVATAR_GRADIENTS } from '../constants';

export function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function toTitleCase(str: string) {
  if (!str) return str;
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// A real inbox (not blank / auto-generated @aivorah.student) gets an invite +
// email verification instead of teacher-shared credentials.
export function isRealStudentEmail(email: string) {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && !e.endsWith('@aivorah.student');
}

export function avatarGradient(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[h];
}

export function lastActiveLabel(dateStr?: string) {
  if (!dateStr) return 'Never';
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// Pulls the first number out of a grade label ("Grade 4" -> 4) — promotion
// targets are always a move FORWARD, so grades at or below the student's
// current one are dropped from the picker.
export function gradeNum(g: string | null | undefined): number | null {
  if (!g) return null;
  const m = String(g).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

export function gradesForProgram(p: string): string[] {
  if (p === 'IB PYP') return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  if (p === 'IB MYP') return ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  if (p === 'IB DP') return ['Grade 11', 'Grade 12'];
  return [];
}
