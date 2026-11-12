import {
  STUDENT_SERVICES, PARENT_SERVICES, TEACHER_SERVICES, SCHOOL_ADMIN_SERVICES, SUPER_ADMIN_SERVICES, PLATFORM_ADMIN_SERVICES,
} from '../roleServices';

const hostOf = (url: string) => new URL(url).hostname;
const has = (list: string[], name: string) => list.map(hostOf).some((h) => h.startsWith(`aivorah-${name}-service`));

test('students wake every service behind their pages (Timetable, Attendance, Challenges, GK, ...)', () => {
  for (const name of [
    'timetable-resources', 'attendance', 'challenges', 'world-and-you', 'daily-habits', 'bedtime-stories',
    'ai-coach', 'help-center', 'parental-controls', 'learning-paths', 'assignments', 'leaderboard', 'schedule',
    'messages', 'auth', 'profile',
  ]) {
    expect(has(STUDENT_SERVICES, name)).toBe(true);
  }
});

test.each([
  ['parent', PARENT_SERVICES, ['students', 'parental-controls', 'daily-habits', 'attendance']],
  ['teacher', TEACHER_SERVICES, ['teacher-dashboard', 'students', 'attendance', 'timetable-resources']],
  ['school admin', SCHOOL_ADMIN_SERVICES, ['school-admin', 'attendance', 'timetable-resources']],
  ['super admin', SUPER_ADMIN_SERVICES, ['teacher-dashboard', 'students', 'challenges']],
  ['platform admin', PLATFORM_ADMIN_SERVICES, ['platform-admin']],
])('%s wakes its services', (_role, list, expected) => {
  for (const name of expected as string[]) expect(has(list as string[], name)).toBe(true);
});

test('only Render service URLs (local dev and the legacy monolith are never pinged)', () => {
  for (const url of [...STUDENT_SERVICES, ...PARENT_SERVICES, ...TEACHER_SERVICES]) {
    expect(url).toMatch(/^https:\/\/aivorah-[a-z0-9-]+\.onrender\.com$/);
  }
});
