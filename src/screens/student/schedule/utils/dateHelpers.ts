import { DAYS_SHORT, HOUR_HEIGHT, TIMELINE_START_HOUR, DURATION_MINS, STUDENT_EVENT_TAGS } from '../constants';

export function deriveTypeFromTag(tag: string): string {
  if (!tag) return 'study';
  const own = STUDENT_EVENT_TAGS.find(t => t.key === tag);
  if (own) return own.type;
  const lower = tag.toLowerCase();
  if (lower.includes('lesson') || lower.includes('live class') || lower.includes('video')) return 'lesson';
  if (lower.includes('challenge')) return 'challenge';
  if (lower.includes('deadline')) return 'deadline';
  if (lower.includes('worksheet') || lower.includes('assignment')) return 'assignment';
  if (lower.includes('break') || lower.includes('working day')) return 'break';
  return 'study';
}

export function calcEventTop(startTime: string): number {
  const [h, m] = startTime.split(':').map(Number);
  return (h - TIMELINE_START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
}

export function calcEventHeight(startTime: string, endTime?: string): number {
  if (!endTime) return HOUR_HEIGHT;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const durationMins = (eh * 60 + em) - (sh * 60 + sm);
  if (durationMins <= 0) return HOUR_HEIGHT;
  // Tall enough for a title that wraps to 2 lines plus the time line.
  return Math.max((durationMins / 60) * HOUR_HEIGHT, 40);
}

export function calcEndTime(startTime: string, duration: string): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + (DURATION_MINS[duration] ?? 60);
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// Returns [accent, pastelfill, textColor] — aligned to the Timetable pastel
// palette so the Calendar and Timetable read as one system. Pastel fills carry
// dark ink and render the same in dark/light (like the timetable cards).
export function typeColors(type: string): [string, string, string] {
  const map: Record<string, [string, string, string]> = {
    lesson:     ['#7FC29B', '#E4F3E9', '#2E7D5B'],  // live class — mint
    study:      ['#7FB2D6', '#E1EEFA', '#2E6285'],  // daily task / personal study — sky
    challenge:  ['#E58AA6', '#FCE0E9', '#9C3556'],  // challenge — rose
    practice:   ['#E58AA6', '#FCE0E9', '#9C3556'],  // student-scheduled challenge session
    deadline:   ['#E3B24C', '#FFF6C9', '#6E5410'],  // worksheet / assignment due — gold
    assignment: ['#E3B24C', '#FFF6C9', '#6E5410'],  // worksheet — gold
    break:      ['#C4BCA9', '#EDE9E2', '#6E6A60'],  // neutral
  };
  return map[type] ?? ['#7FB2D6', '#E1EEFA', '#2E6285'];
}

export function toTitleCase(str: string) {
  return String(str || '').replace(/\b\w/g, c => c.toUpperCase());
}

// '08:00' → '8 AM', '13:00' → '1 PM' — friendly 12-hour axis (not railway time).
export function fmtHour12(hhmm: string): string {
  const h = Number(hhmm.split(':')[0]);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}

// LOCAL date, not UTC — toISOString() converts to UTC first, which rolls the
// date back a day for any local time before UTC's midnight in a timezone
// ahead of UTC (e.g. IST, UTC+5:30: any local time before 5:30am becomes the
// previous day once converted). This was the "scheduled on the 23rd, saved
// as the 22nd" bug — every caller here wants the calendar day the user is
// actually looking at, not a UTC-shifted one.
export function dateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildWeek(baseDate: Date): { iso: string; day: string; date: number }[] {
  const dow = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { iso: dateISO(d), day: DAYS_SHORT[i], date: d.getDate() };
  });
}

export function buildMonthCalendar(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
