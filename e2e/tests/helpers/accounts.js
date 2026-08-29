// The 15 test accounts, in one place.
//
// The important column here is "mutable". Our tests all run at the same time
// (see CLAUDE.md), so two tests writing the same field on the same account
// would trip over each other.
//
// The rule we follow:
//   - read-only accounts: any number of tests can share them, because nothing
//     they do changes the account.
//   - mutable accounts: exactly ONE spec file owns each one. If you add a spec
//     that saves something, give it its own account rather than borrowing.
//
// Seeded by ai-mentor/server/scripts/seed-e2e-suite.js.

export const PASSWORD = process.env.E2E_PASSWORD;

export const ACCOUNTS = {
  // ── school_admin ──
  'admin-a': {
    email: process.env.E2E_ADMIN_A,
    role: 'school_admin',
    school: 'TSRA',
    mutable: false,
  },
  'admin-b': {
    email: process.env.E2E_ADMIN_B,
    role: 'school_admin',
    school: 'E2E School Mutate',
    mutable: true,
  },
  'admin-c': {
    email: process.env.E2E_ADMIN_C,
    role: 'school_admin',
    school: 'E2E School Isolation',
    mutable: false,
  },

  // ── teacher ──
  'teacher-a': {
    email: process.env.E2E_TEACHER_A,
    role: 'teacher',
    school: 'TSRA',
    mutable: false,
  },
  'teacher-b': { email: process.env.E2E_TEACHER_B, role: 'teacher', school: 'TSRA', mutable: true },
  'teacher-c': {
    email: process.env.E2E_TEACHER_C,
    role: 'teacher',
    school: 'E2E School Content',
    mutable: true,
  },
  // Linked to student-r only (teacher_student) - dedicated to the
  // Assignments spec's cross-persona test (real teacher UI assigns a
  // quiz -> real student UI receives + submits it). Separate from
  // teacher-a's roster so this test's Quiz Library seed data can't
  // collide with the teacher-dashboard analytics specs.
  'teacher-d': { email: process.env.E2E_TEACHER_D, role: 'teacher', school: 'TSRA', mutable: true },
  // Dedicated to tests/teacher/students/*.spec.js. This spec creates,
  // links, bulk-imports, removes, and promotes real students on its own
  // roster - needs full isolation so its student-count/roster mutations
  // never collide with teacher-dashboard analytics or Assignments specs
  // reading a shared account's student list.
  'teacher-e': { email: process.env.E2E_TEACHER_E, role: 'teacher', school: 'E2E School Content', mutable: true },

  // ── parent ──
  'parent-a': { email: process.env.E2E_PARENT_A, role: 'parent', school: 'TSRA', mutable: false },
  'parent-b': { email: process.env.E2E_PARENT_B, role: 'parent', school: 'TSRA', mutable: true },
  'parent-c': { email: process.env.E2E_PARENT_C, role: 'parent', school: 'TSRA', mutable: true },
  'parent-d': { email: process.env.E2E_PARENT_D, role: 'parent', school: 'TSRA', mutable: true },
  // Read-only - the only parent linked to TWO children (student-a,
  // student-b), for the Parent Dashboard child-switching spec.
  'parent-e': { email: process.env.E2E_PARENT_E, role: 'parent', school: 'TSRA', mutable: false },
  // Mutable - dedicated to the Weekly Snapshot spec (writes to
  // student-parent-f). Separate from parent-e (order-sensitive child-switching
  // test) and parent-d (owned by the Challenges spec).
  'parent-f': { email: process.env.E2E_PARENT_F, role: 'parent', school: 'TSRA', mutable: true },
  // Mutable - dedicated to the Achievements spec (pushes student-parent-g
  // past each badge threshold via real API calls). Separate account so
  // streak/XP mutations here can't collide with parent-d/parent-f's own.
  'parent-g': { email: process.env.E2E_PARENT_G, role: 'parent', school: 'TSRA', mutable: true },
  // Read-only - deliberately has zero linked children, for the Parent
  // Dashboard empty/error-state specs (same role teacher-b plays for the
  // teacher-dashboard empty-state spec).
  'parent-h': { email: process.env.E2E_PARENT_H, role: 'parent', school: 'TSRA', mutable: false },
  // parent-f2..f7 - each dedicated to exactly ONE weekly-snapshot.spec.js
  // test that mutates student_stats fields (currentStreak/xpPoints/
  // studyTimeMinutes) via absolute PUT sets. Splitting these out is what
  // lets that file's 7 tests run in parallel instead of serial - see
  // OWNERSHIP below for which test owns which.
  'parent-f2': { email: process.env.E2E_PARENT_F2, role: 'parent', school: 'TSRA', mutable: true },
  'parent-f3': { email: process.env.E2E_PARENT_F3, role: 'parent', school: 'TSRA', mutable: true },
  'parent-f4': { email: process.env.E2E_PARENT_F4, role: 'parent', school: 'TSRA', mutable: true },
  'parent-f5': { email: process.env.E2E_PARENT_F5, role: 'parent', school: 'TSRA', mutable: true },
  'parent-f6': { email: process.env.E2E_PARENT_F6, role: 'parent', school: 'TSRA', mutable: true },
  'parent-f7': { email: process.env.E2E_PARENT_F7, role: 'parent', school: 'TSRA', mutable: true },
  // Mutable - dedicated to the Parent Profile spec (PATCHes its own name/
  // phone/location via PATCH /user/profile). Linked read-only to student-a
  // for the Activity Overview card's "N kids" count - never mutates
  // student-a itself.
  'parent-i': { email: process.env.E2E_PARENT_I, role: 'parent', school: 'TSRA', mutable: true },

  // ── student ──
  'student-a': {
    email: process.env.E2E_STUDENT_A,
    role: 'student',
    school: 'TSRA',
    mutable: false,
  },
  'student-b': { email: process.env.E2E_STUDENT_B, role: 'student', school: 'TSRA', mutable: true },
  'student-c': { email: process.env.E2E_STUDENT_C, role: 'student', school: 'TSRA', mutable: true },
  // student-d1..d9: one account per onboarding test (see OWNERSHIP below).
  // Onboarding writes the onboarding_completed flag, and the 9 onboarding
  // tests all run in parallel - sharing one account meant one test's reset
  // or completed-onboarding state stomped on another mid-run.
  'student-d1': {
    email: process.env.E2E_STUDENT_D1,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d2': {
    email: process.env.E2E_STUDENT_D2,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d3': {
    email: process.env.E2E_STUDENT_D3,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d4': {
    email: process.env.E2E_STUDENT_D4,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d5': {
    email: process.env.E2E_STUDENT_D5,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d6': {
    email: process.env.E2E_STUDENT_D6,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d7': {
    email: process.env.E2E_STUDENT_D7,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d8': {
    email: process.env.E2E_STUDENT_D8,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-d9': {
    email: process.env.E2E_STUDENT_D9,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  // Dedicated to the gender/dob/state persistence-across-return regression
  // test (2026-08-26) — separate from d1-d9 above for the same
  // parallel-tests-need-separate-accounts reason.
  'student-d10': {
    email: process.env.E2E_STUDENT_D10,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-e': { email: process.env.E2E_STUDENT_E, role: 'student', school: 'TSRA', mutable: true },
  'student-f': { email: process.env.E2E_STUDENT_F, role: 'student', school: 'TSRA', mutable: true },
  'student-g': { email: process.env.E2E_STUDENT_G, role: 'student', school: 'TSRA', mutable: true },
  'student-h': { email: process.env.E2E_STUDENT_H, role: 'student', school: 'TSRA', mutable: true },
  // Dedicated to the AI Coach spec (sends real chat messages, which likely
  // updates activity/topic stats via exploreTopic() - isolated so it can't
  // collide with student-a (shared, read-only) or any other spec's account).
  'student-i': { email: process.env.E2E_STUDENT_I, role: 'student', school: 'TSRA', mutable: true },
  // IB PYP/Grade 4, dedicated to tests/student/challenges/*.spec.js - own
  // starting/completing/timer flow mutates XP, challengesCompleted and
  // streak. Deliberately IB PYP/Grade 4, not CBSE: 19 of its 22 challenges
  // have questions pre-stored in challenge_questions (served instantly, no
  // AI call) - CBSE/Grade 3+ has none at all and falls through to on-demand
  // Groq generation every time (routes/ncert.js), which broke under a
  // rate-limited key (see challenges.spec.js's pickChallenge() for the
  // excluded 3 IDs that still need AI). Not linked to any parent/teacher -
  // the student's own Challenges screen assigns to itself directly
  // (assignedByRole: 'student').
  'student-j': { email: process.env.E2E_STUDENT_J, role: 'student', school: 'TSRA', mutable: true },
  // Dedicated to tests/student/schedule/*.spec.js - creates/deletes real
  // schedule events via the Schedule screen's own Add Event modal. Isolated
  // so those mutations can't collide with any other spec's account.
  'student-k': { email: process.env.E2E_STUDENT_K, role: 'student', school: 'TSRA', mutable: true },
  // Dedicated to tests/student/world-and-you/*.spec.js - completing the
  // Current Affairs quiz awards real XP via POST /daily-tidbit/quiz-complete
  // (xp_points += correct*10, see api.js's getStudentXp comment). Isolated so
  // those XP writes can't collide with student-i's/student-j's own XP
  // mutations or any other spec's account.
  //
  // NOT YET SEEDED: add E2E_STUDENT_L to .env and add this account to
  // server/scripts/seed-e2e-accounts.js before running tests/student/
  // world-and-you/*.spec.js - see the spec file's own header comment.
  'student-l': { email: process.env.E2E_STUDENT_L, role: 'student', school: 'TSRA', mutable: true },
  // Dedicated to world-and-you.spec.js's "reopening the quiz after
  // completing it today ..." test - split out from student-l because that
  // test also completes the real Current Affairs quiz for real XP, and
  // running both tests in parallel on one account raced their
  // xpBefore/xpAfter deltas (see student-l3's comment - same root cause).
  // Seeded via server/scripts/seed-student-l2.js.
  'student-l2': {
    email: process.env.E2E_STUDENT_L2,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  // Dedicated to world-and-you.spec.js's "completion persists across a full
  // page refresh on the same day" test - same isolation reason as
  // student-l2: this test also completes the real quiz for real XP, and
  // three parallel tests (student-l's own completion test, this one, and
  // student-l2's) racing on one shared account produced a false XP-mismatch
  // failure (confirmed 2026-08-10, "Expected: 380, Received: 400").
  // Seeded via server/scripts/seed-student-l3.js.
  'student-l3': {
    email: process.env.E2E_STUDENT_L3,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  // Dedicated to tests/student/settings/*.spec.js - profile field edits
  // (name/grade/curriculum/location/email validation). NOT usable by any
  // other spec: its Grade field gets mutated-then-reverted by that suite's
  // own test, which previously collided with learning-path's need for a
  // STABLE Grade 6 profile (confirmed 2026-08-12 - see student-q below).
  'student-m': { email: process.env.E2E_STUDENT_M, role: 'student', school: 'TSRA', mutable: true },
  'student-n': { email: process.env.E2E_STUDENT_N, role: 'student', school: 'TSRA', mutable: true },
  'student-o': { email: process.env.E2E_STUDENT_O, role: 'student', school: 'TSRA', mutable: true },
  'student-p': { email: process.env.E2E_STUDENT_P, role: 'student', school: 'TSRA', mutable: true },
  // CBSE/Grade 6, dedicated to tests/student/learning-path/*.spec.js - the
  // ONLY account in this suite with a STABLE Grade 6 profile, needed to
  // reach the curated CBSE G6 English syllabus (cbseG6EnglishSyllabus.ts,
  // active only for Grade 6 - see AIMentorApp/src/data/syllabusRegistry.ts)
  // and its "Fables and Folk Tales" chapter/topic. student-a (the usual
  // shared read-only account) is CBSE Grade 3 and does not have this
  // content. Originally used student-m for this, but that account's Grade
  // field is also owned/mutated by tests/student/settings/*.spec.js's
  // Profile-fields test - the two collided (settings' own revert reset the
  // grade back to 3 mid-suite, confirmed 2026-08-12). Split out to its own
  // account to guarantee Grade 6 stays put. Seeded via
  // server/scripts/seed-student-learning-path-g6.js.
  'student-q': { email: process.env.E2E_STUDENT_Q, role: 'student', school: 'TSRA', mutable: true },
  // CBSE/Grade 3, dedicated to tests/student/assignments/*.spec.js - creates
  // and submits real assignments via POST /assignments and its own UI, so
  // pending/completed counts can't collide with any other spec's account.
  // Seeded via server/scripts/seed-student-assignments-r.js.
  'student-r': { email: process.env.E2E_STUDENT_R, role: 'student', school: 'TSRA', mutable: true },
  // Linked to teacher-a for Mathematics (see TEACHER_LINKS in seed-e2e-suite.js) -
  // the only student account wired to a teacher, so teacher-dashboard analytics
  // specs (Learning Path / Assignment / Challenge) can drive real activity and
  // check it reflects on teacher-a's dashboard.
  'student-teacher-a': {
    email: process.env.E2E_STUDENT_TEACHER_A,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  // Linked to parent-d, CBSE/Grade 3 (same reason as student-teacher-a - the
  // `challenges` table has zero rows for NCERT), so the Parent Challenges
  // spec can assign/complete real challenges without disturbing parent-a
  // (shared, read-only, NCERT - always empty-state for challenges).
  'student-parent-d': {
    email: process.env.E2E_STUDENT_PARENT_D,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  // Linked to parent-f only - dedicated to the Weekly Snapshot spec's
  // study-time/topic-completion mutations.
  'student-parent-f': {
    email: process.env.E2E_STUDENT_PARENT_F,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  // Linked to parent-g only - starts with zero achievement badges; the
  // Achievements spec pushes it past each threshold and checks the badge
  // unlocks.
  'student-parent-g': {
    email: process.env.E2E_STUDENT_PARENT_G,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  // Linked to parent-f2..f7 respectively (one pair per weekly-snapshot.spec.js
  // test) - see parent-f2..f7's comment above.
  'student-parent-f2': {
    email: process.env.E2E_STUDENT_PARENT_F2,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-parent-f3': {
    email: process.env.E2E_STUDENT_PARENT_F3,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-parent-f4': {
    email: process.env.E2E_STUDENT_PARENT_F4,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-parent-f5': {
    email: process.env.E2E_STUDENT_PARENT_F5,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-parent-f6': {
    email: process.env.E2E_STUDENT_PARENT_F6,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
  'student-parent-f7': {
    email: process.env.E2E_STUDENT_PARENT_F7,
    role: 'student',
    school: 'TSRA',
    mutable: true,
  },
};

// Which spec file owns which mutable account. Keeping this written down means
// the next person can see at a glance whether an account is already spoken for.
export const OWNERSHIP = {
  'student-b': 'tests/student/dashboard.spec.js  (display name, profile photo)',
  'student-c':
    'tests/student/profile.spec.js    (edit-popup fields: name, school, bio, location, curriculum, grade)',
  'student-g':
    'tests/student/profile.spec.js    (avatar style, learning style, interests - these write user_preferences, not the popup fields)',
  'student-h':
    'tests/student/profile.spec.js    (profile photo only - the avatar test deletes the photo, so it cannot share with student-g); ' +
    'ALSO tests/student/leaderboard/leaderboard.spec.js (temporarily sets xpPoints to force rank #1, restores original value in a finally block - non-overlapping field, safe to share)',
  'student-d1..d9':
    'tests/student/onboarding.spec.js (one account per test - onboarding_completed flag)',
  'student-e': 'parent screen-time tests         (lock flag written by parent-b)',
  'student-f': 'parent screen-time tests         (lock flag written by parent-c)',
  'teacher-b': 'teacher profile/settings tests',
  'teacher-c': 'teacher content creation tests',
  'teacher-d':
    'tests/student/assignments/assignments.spec.js (cross-persona test - assigns a real quiz to student-r via the real Teacher Assignments UI)',
  'teacher-e': 'tests/teacher/students/*.spec.js (create/link/bulk-import/remove/promote real students on its own roster)',
  'parent-b': 'parent controls tests            (writes to student-e)',
  'parent-c': 'parent controls tests            (writes to student-f)',
  'admin-b': 'school-admin mutation tests       (create/delete student)',
  'student-teacher-a':
    'tests/teacher/*-analytics.spec.js (Learning Path / Assignment / Challenge dashboard analytics)',
  'parent-d':
    'tests/parent/challenges/challenges.spec.js (assign/complete a challenge, writes to student-parent-d); ' +
    'ALSO tests/student/daily-habits/daily-habits.spec.js (creates parent_daily_tasks for student-parent-d) - ' +
    'safe to share: habits_checkins/parent_daily_tasks/student_preferences.total_coins is a completely separate ' +
    "domain from challenge_assignments/student_stats, confirmed by reading both features' routes before reusing this pair.",
  'student-parent-d':
    'tests/parent/challenges/challenges.spec.js (assigned/completed by parent-d); ' +
    'ALSO tests/student/daily-habits/daily-habits.spec.js (own habit checkins/coins) - see parent-d note above.',
  'parent-f':
    'weekly-snapshot.spec.js (topic + study-time -> Learning Journey/Mission/Growth); ' +
    'ALSO tests/student/daily-habits/daily-habits.spec.js (owns the "checking a habit" test - ' +
    "needs sole ownership of Today/Total Coins aggregates, see that file's isolation note)",
  'student-parent-f':
    'weekly-snapshot.spec.js (mutated by parent-f); ALSO daily-habits.spec.js (checking test)',
  'parent-f2':
    'weekly-snapshot.spec.js (Attendance Record display + marking); ' +
    'ALSO tests/student/daily-habits/daily-habits.spec.js (owns the "persistence across reload" test)',
  'student-parent-f2':
    'weekly-snapshot.spec.js (mutated by parent-f2); ALSO daily-habits.spec.js (persistence test)',
  'parent-f3': 'weekly-snapshot.spec.js (Activity Overview graph, study-time)',
  'student-parent-f3': 'weekly-snapshot.spec.js (mutated by parent-f3)',
  'parent-f4': 'weekly-snapshot.spec.js (Subject Performance quiz)',
  'student-parent-f4': 'weekly-snapshot.spec.js (mutated by parent-f4)',
  'parent-f5': 'weekly-snapshot.spec.js (Learning Mood, currentStreak)',
  'student-parent-f5': 'weekly-snapshot.spec.js (mutated by parent-f5)',
  'parent-f6': 'weekly-snapshot.spec.js (Learning Highlights, xpPoints+currentStreak)',
  'student-parent-f6': 'weekly-snapshot.spec.js (mutated by parent-f6)',
  'parent-f7': 'weekly-snapshot.spec.js (Top Interest/Learning Style/AI Insight)',
  'student-parent-f7': 'weekly-snapshot.spec.js (mutated by parent-f7)',
  'parent-i': 'tests/parent/profile/profile.spec.js (PATCHes its own name/phone/location)',
  'parent-g':
    'tests/parent/dashboard/achievements/achievements.spec.js (writes to student-parent-g); ' +
    'ALSO tests/student/daily-habits/daily-habits.spec.js (owns the "unchecking a habit" test)',
  'student-parent-g':
    'tests/parent/dashboard/achievements/achievements.spec.js (mutated by parent-g); ' +
    'ALSO daily-habits.spec.js (unchecking test)',
  'student-i': 'tests/student/ai-coach/*.spec.js (sends real chat messages via the AI Coach UI)',
  'student-j':
    'tests/student/challenges/*.spec.js (starts/answers/submits challenges via its own Challenges screen)',
  'student-k':
    'tests/student/schedule/*.spec.js (creates/deletes schedule events via its own Schedule screen)',
  'student-l':
    'tests/student/world-and-you/*.spec.js (completes the Current Affairs quiz via its own UI, awarding real XP)',
  'student-l2':
    'tests/student/world-and-you/*.spec.js ("reopening the quiz after completing it today" - completes the quiz for real, isolated from student-l)',
  'student-l3':
    'tests/student/world-and-you/*.spec.js ("completion persists across a full page refresh" - completes the quiz for real, isolated from student-l/student-l2)',
  'student-m':
    'tests/student/settings/*.spec.js (profile field edits: name/grade/curriculum/location)',
  'student-n': 'tests/student/settings/*.spec.js (notification toggles + theme preference)',
  'student-o': 'tests/student/settings/*.spec.js (real password change, reverted after)',
  'student-p':
    'tests/student/settings/*.spec.js (Delete Account modal/validation tests - never actually deleted)',
  'student-q':
    'tests/student/learning-path/*.spec.js (CBSE Grade 6 - Learning Path/Lesson/Practice flow, "Fables and Folk Tales")',
  'student-r':
    'tests/student/assignments/*.spec.js (creates/submits real assignments via API+UI - stats/tabs/empty/error/detail flows)',
};

export function accountFor(key) {
  const account = ACCOUNTS[key];
  if (!account) throw new Error(`Unknown test account "${key}".`);
  if (!account.email) throw new Error(`Missing .env email for test account "${key}".`);
  return account;
}
