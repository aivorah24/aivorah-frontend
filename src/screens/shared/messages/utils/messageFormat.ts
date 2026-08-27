import { AIVORAH_EMAIL } from '../constants';

export function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Date chip shown above the first message of each day in a thread.
export function formatDateDivider(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
}

// Parse message content — may be plain text or JSON with attachment
export function parseContent(content: string): { text: string; attachment?: { url: string; name: string; size: number; type: string } } {
  try {
    if (content.startsWith('{')) {
      const parsed = JSON.parse(content);
      if (parsed.attachment) return parsed;
    }
  } catch {}
  return { text: content };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileIcon(type: string): string {
  if (/pdf/.test(type)) return 'file-text';
  if (/png|jpg|jpeg|gif/.test(type)) return 'image';
  if (/doc|docx/.test(type)) return 'file-text';
  if (/xls|xlsx|csv/.test(type)) return 'grid';
  if (/ppt|pptx/.test(type)) return 'monitor';
  return 'paperclip';
}

// The Aivorah system sender (assignment/challenge reminders) is shown as a friendly
// "Learning Buddy" rather than the raw DB role ('teacher').
export function isAivorah(c?: { otherEmail?: string; otherName?: string } | null) {
  return c?.otherEmail === AIVORAH_EMAIL || c?.otherName === 'Aivorah';
}
export function roleLabel(role: string) {
  return role === 'teacher' || role === 'school_admin' ? 'Staff' : 'Parent';
}
export function convoRoleLabel(c: { otherEmail?: string; otherName?: string; otherRole: string }) {
  return isAivorah(c) ? 'Learning Buddy' : roleLabel(c.otherRole);
}
