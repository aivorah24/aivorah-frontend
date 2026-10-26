export const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
// Full-day axis (12 AM – 11 PM) like Toddle; the grid auto-scrolls to the
// current hour on load (see scrollToCurrentTime) so it opens on relevant hours.
export const TIMES = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
export const CAL_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
export const DURATIONS = ['30 min', '45 min', '1 hr', '1.5 hrs', '2 hrs', '2.5 hrs', '3 hrs'];

// ── Canonical tag definitions (mirrors Toddle's tag sidebar) ──────────────
export const ASSIGNMENT_TAGS = [
  { key: 'Live Class / Lesson', color: '#7FC29B' },
  { key: 'Study Session',       color: '#C9A24E' },
  { key: 'Learning experience', color: '#7FC29B' },
  { key: 'Quick task',          color: '#7FB2D6' },
  { key: 'Worksheet / Assignment', color: '#E3B24C' },
  { key: 'AI Tutor',            color: '#9B8FE8' },
  { key: 'Video meeting',       color: '#E58AA6' },
  { key: 'AI Challenge',        color: '#6B5BA8' },
  { key: 'Deadline',            color: '#B84A3A' },
];

export const EVENT_TAGS = [
  { key: 'Holidays and vacations', color: '#E58AA6' },
  { key: 'Whole school events',    color: '#7FC29B' },
  { key: 'Special Assembly',       color: '#7FC29B' },
  { key: 'Working Day / Break',    color: '#C4BCA9' },
  { key: 'MYP Unit Timeline',      color: '#E58AA6' },
  { key: 'Rotation Day Cycle',     color: '#7FB2D6' },
  { key: 'SmartTask Cycle Timeline', color: '#E58AA6' },
];

// Options a student picks from when adding their own event (filters still use the tags above).
export const STUDENT_EVENT_TAGS = [
  { key: 'Study Session',     type: 'study',      color: '#7FB2D6' },
  { key: 'Class / Lesson',    type: 'lesson',     color: '#7FC29B' },
  { key: 'Homework',          type: 'assignment', color: '#E3B24C' },
  { key: 'Assignment',        type: 'assignment', color: '#E3B24C' },
  { key: 'Challenge',         type: 'practice',   color: '#E58AA6' },
  { key: 'Quick Task',        type: 'study',      color: '#7FB2D6' },
  { key: 'Learning Activity', type: 'study',      color: '#9B8FE8' },
  { key: 'Break',             type: 'break',      color: '#C4BCA9' },
  { key: 'Other',             type: 'study',      color: '#A8A29A' },
];

export const HOUR_HEIGHT = 56;
export const DAY_COL_WIDTH = 140;
export const TIME_LABEL_WIDTH = 64;
export const TIMELINE_START_HOUR = Number(TIMES[0].split(':')[0]);
export const DURATION_MINS: Record<string, number> = {
  '30 min': 30, '45 min': 45, '1 hr': 60,
  '1.5 hrs': 90, '2 hrs': 120, '2.5 hrs': 150, '3 hrs': 180,
};
export const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
