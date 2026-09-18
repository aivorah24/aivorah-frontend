import { ALL_TAGS, DURATION_MINS, DAYS_SHORT, HOUR_HEIGHT, TIMELINE_START_HOUR } from '../constants';
import type { WeekDay } from '../types';

export function deriveTypeFromTag(tag: string): string {
  if (!tag) return 'study';
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
  // Minimum tall enough to fit all 3 lines (title, time, student) without
  // clipping — a 30-min slot at HOUR_HEIGHT scale was too short and cut off
  // the bottom line.
  return Math.max((durationMins / 60) * HOUR_HEIGHT, 46);
}

export function calcEndTime(startTime: string, duration: string): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + (DURATION_MINS[duration] ?? 60);
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// Returns [accentColor, pastelfill, textColor]
export function typeColors(type: string): [string, string, string] {
  const map: Record<string, [string, string, string]> = {
    lesson:     ['#9C844A', '#F5EDDA', '#6B5A30'],  // gold accent / warm cream fill / dark gold text
    study:      ['#C9A24E', '#FBF3DA', '#7A5C1E'],  // amber-gold accent / pale gold fill / dark amber text (Aivorah theme)
    challenge:  ['#6B5BA8', '#E8E4F5', '#3F3270'],  // purple accent / lavender fill / dark purple text
    deadline:   ['#B84A3A', '#F5DDD9', '#7A2A1E'],  // red accent / rose fill / dark red text
    assignment: ['#3A8A6A', '#D9F0E8', '#1E5A40'],  // green accent / mint fill / dark green text
    break:      ['#7A7A7A', '#EBEBEB', '#4A4A4A'],  // grey accent / light grey fill / dark grey text
  };
  return map[type] ?? ['#9C844A', '#F5EDDA', '#6B5A30'];
}

// Prefer the event's own tag color (same swatch shown in Tag Filters and the
// tag picker) so a chip on the calendar always matches its tag — falls back
// to the coarse type-bucket color only for legacy events with no tag.
export function tagColors(tag: string | null | undefined, type: string): [string, string, string] {
  const match = tag ? ALL_TAGS.find(t => tag.toLowerCase().includes(t.key.toLowerCase())) : null;
  if (match) return [match.color, match.color + '22', match.color];
  return typeColors(type);
}

// LOCAL date, not UTC — toISOString() rolls the date back a day for any
// local time before UTC's midnight in a timezone ahead of UTC (e.g. IST),
// which was the "scheduled on the 23rd, saved as the 22nd" bug. See the
// identical fix + rationale in student/schedule/utils/dateHelpers.ts.
export function dateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Bug #19: was Monday-first (`monday.setDate(base.getDate() - ((dow + 6) % 7))`)
// — changed to Sunday-first per explicit user request. `getDay()` already
// returns 0 for Sunday, so no wraparound math is needed here at all.
export function buildWeek(base: Date): WeekDay[] {
  const dow = base.getDay();
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return { iso: dateISO(d), day: DAYS_SHORT[i], date: d.getDate() };
  });
}

export function fmtHour12(hhmm: string): string {
  const h = Number(hhmm.split(':')[0]);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}
