import AI_COACH_SERVER_URL from './aiCoachServerUrl';
import ASSIGNMENTS_SERVER_URL from './assignmentsServerUrl';
import ATTENDANCE_SERVER_URL from './attendanceServerUrl';
import AUTH_SERVER_URL from './authServerUrl';
import BEDTIME_STORIES_SERVER_URL from './bedtimeStoriesServerUrl';
import CHALLENGES_SERVER_URL from './challengesServerUrl';
import CURRENT_AFFAIRS_SERVER_URL from './currentAffairsServerUrl';
import DAILY_HABITS_SERVER_URL from './dailyHabitsServerUrl';
import HELP_SERVICE_URL from './helpServiceUrl';
import LEADERBOARD_SERVICE_URL from './leaderboardServiceUrl';
import LEARNING_PATHS_SERVER_URL from './learningPathsServerUrl';
import MESSAGES_SERVER_URL from './messagesServerUrl';
import PARENTAL_CONTROLS_SERVER_URL from './parentalControlsServerUrl';
import PLATFORM_ADMIN_SERVER_URL from './platformAdminServerUrl';
import PROFILE_SERVER_URL from './profileServerUrl';
import SCHEDULE_SERVER_URL from './scheduleServerUrl';
import SCHOOL_ADMIN_SERVER_URL from './schoolAdminServerUrl';
import STUDENTS_SERVER_URL from './studentsServerUrl';
import TEACHER_DASHBOARD_SERVER_URL from './teacherDashboardServerUrl';
import TIMETABLE_RESOURCES_SERVER_URL from './timetableResourcesServerUrl';
import WORLD_AND_YOU_SERVER_URL from './worldAndYouServerUrl';

// Every backend service each role's screens call (checked against the config
// imports under src/screens/<role>, src/screens/shared, src/features,
// src/components and src/context on 2026-11-12). The role navigator wakes all
// of them at sign-in and keeps them awake while the app is open
// (useRoleWarmup → keepServicesWarm), because Render puts an idle service to
// sleep and the first request after that waits 20-50 s.
// Add a service here when a role's screen starts using it.

// Used by every role: sign-in, profile, messages/notifications, announcements
// banner, My Classes / attendance, timetable & resources.
const SHARED = [
  AUTH_SERVER_URL,
  PROFILE_SERVER_URL,
  MESSAGES_SERVER_URL,
  SCHOOL_ADMIN_SERVER_URL,
  ATTENDANCE_SERVER_URL,
  TIMETABLE_RESOURCES_SERVER_URL,
];

export const STUDENT_SERVICES = [
  ...SHARED,
  LEARNING_PATHS_SERVER_URL,
  ASSIGNMENTS_SERVER_URL,
  LEADERBOARD_SERVICE_URL,
  SCHEDULE_SERVER_URL,
  CHALLENGES_SERVER_URL,
  AI_COACH_SERVER_URL,
  BEDTIME_STORIES_SERVER_URL,
  DAILY_HABITS_SERVER_URL,
  HELP_SERVICE_URL,
  PARENTAL_CONTROLS_SERVER_URL,
  WORLD_AND_YOU_SERVER_URL,
  CURRENT_AFFAIRS_SERVER_URL,
];

export const PARENT_SERVICES = [
  ...SHARED,
  STUDENTS_SERVER_URL,
  LEARNING_PATHS_SERVER_URL,
  DAILY_HABITS_SERVER_URL,
  ASSIGNMENTS_SERVER_URL,
  CHALLENGES_SERVER_URL,
  LEADERBOARD_SERVICE_URL,
  HELP_SERVICE_URL,
  PARENTAL_CONTROLS_SERVER_URL,
];

export const TEACHER_SERVICES = [
  ...SHARED,
  TEACHER_DASHBOARD_SERVER_URL,
  ASSIGNMENTS_SERVER_URL,
  STUDENTS_SERVER_URL,
  LEARNING_PATHS_SERVER_URL,
  SCHEDULE_SERVER_URL,
  CHALLENGES_SERVER_URL,
  LEADERBOARD_SERVICE_URL,
];

export const SCHOOL_ADMIN_SERVICES = [...SHARED];

export const SUPER_ADMIN_SERVICES = [
  ...SHARED,
  TEACHER_DASHBOARD_SERVER_URL,
  STUDENTS_SERVER_URL,
  CHALLENGES_SERVER_URL,
];

export const PLATFORM_ADMIN_SERVICES = [AUTH_SERVER_URL, PROFILE_SERVER_URL, PLATFORM_ADMIN_SERVER_URL, CURRENT_AFFAIRS_SERVER_URL];
