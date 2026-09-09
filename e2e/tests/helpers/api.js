// Direct, READ-ONLY Supabase lookup for the teacher's own DB id - the
// challenge-assign endpoint stores assigned_by_id raw (no email resolution,
// unlike assignments.js's resolveUserId), so we need the real id. Same
// admin-client pattern already used by resetProfile.js/resetOnboarding.js.
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// The `request` fixture shares playwright.config.js's baseURL (the FRONTEND
// dev server) with the `page` fixture. Locally that frontend runs on its own
// port (Metro, e.g. 3006) separate from the backend monolith (e.g. 3007) -
// see aivorah-frontend/src/config/serverUrl.ts. Every direct backend call in
// this file must target the backend explicitly, not baseURL, or it silently
// 404s against the frontend server instead. Override via BACKEND_URL if the
// backend runs on a different port in your environment.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3007';

// Schedule was migrated off the monolith to its own microservice
// (aivorah-schedule-service) - both the student ScheduleScreen and the
// teacher schedule screen write/read here now (confirmed 2026-08-25: the
// monolith's own /schedule/teacher route still responds but returns stale/
// empty data, since nothing writes to it anymore - using BACKEND_URL for
// schedule verification silently reads the wrong backend). Override via
// SCHEDULE_SERVICE_URL if it runs on a different port in your environment.
const SCHEDULE_SERVICE_URL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3009';

// The following 5 microservices back the refactored student+teacher
// features this suite actually exercises (2026-08-26 migration pass —
// verified against each service's real routes, not assumed): challenges,
// student stats/XP/lesson-progress, assignments, and profile (used only
// for the read-only user-id-by-email lookup below). Non-refactored teacher
// screens (Attendance) still depend on the monolith and are deliberately
// NOT covered by this pass - see the migration-plan discussion, not a gap
// here. Parent Challenges was migrated off the monolith 2026-09-02 (see
// aivorah-frontend PR #36) - assignChallenge/assignChallengeAsParent/
// listAssignedChallenges/completeChallenge below were missed in that pass
// and still posted to BACKEND_URL (the monolith), which 404s on any
// microservice-only challenge id (fixed 2026-09-02, same day as PR #36 -
// only surfaced once the type-taxonomy fix let a real microservice
// challenge id become a selectable E2E target).
const CHALLENGES_SERVICE_URL      = process.env.CHALLENGES_SERVICE_URL      || 'http://localhost:3008';
// Student stats/XP (GET /student/:id) live on aivorah-students-service, the
// same backend the refactored ParentChallengesScreen's fetchChildStats calls
// (aivorah-frontend PR #36) - not BACKEND_URL/the monolith, which the parent
// challenges spec previously (wrongly) used relative /student/:id calls for.
const STUDENTS_SERVICE_URL        = process.env.STUDENTS_SERVICE_URL        || 'http://localhost:3017';
// Screen-time limits/weekly cap/allowed hours/break enforcer/subject filter -
// extracted from the monolith into its own service 2026-09-03. Same Supabase
// project (Dev DB) as STUDENTS_SERVICE_URL, so child ids resolved via that
// service line up with this one's parent_children/screen_time checks.
const PARENTAL_CONTROLS_SERVICE_URL = process.env.PARENTAL_CONTROLS_SERVICE_URL || 'http://localhost:3018';
const LEADERBOARD_SERVICE_URL     = process.env.LEADERBOARD_SERVICE_URL     || 'http://localhost:4003';
const ASSIGNMENTS_SERVICE_URL     = process.env.ASSIGNMENTS_SERVICE_URL     || 'http://localhost:3015';
const PROFILE_SERVICE_URL         = process.env.PROFILE_SERVICE_URL         || 'http://localhost:4002';
const TEACHER_DASHBOARD_SERVICE_URL = process.env.TEACHER_DASHBOARD_SERVICE_URL || 'http://localhost:3016';
export {
  BACKEND_URL, SCHEDULE_SERVICE_URL, CHALLENGES_SERVICE_URL, STUDENTS_SERVICE_URL,
  PARENTAL_CONTROLS_SERVICE_URL, LEADERBOARD_SERVICE_URL, ASSIGNMENTS_SERVICE_URL,
  PROFILE_SERVICE_URL, TEACHER_DASHBOARD_SERVICE_URL,
};

export async function getTeacherIdByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  if (error || !data)
    throw new Error(`No user found for ${email}: ${error?.message ?? 'not found'}`);
  return data.id;
}

// Direct backend calls used to SEED activity for cross-persona tests
// (e.g. "student completes a topic -> teacher dashboard reflects it").
//
// We don't drive the student-side quiz UI for this - completing a topic
// legitimately requires reading a lesson and passing a multi-question quiz,
// which is its own (separate, not yet written) student-side test concern.
// Here we only care about the teacher dashboard reacting correctly to a
// completion that has already happened, so we create that completion
// directly against the same endpoint the app itself calls.

// Looks up a student's DB id from a teacher's roster by matching email -
// the dashboard's own by-teacher endpoint already returns this, so this
// is exactly what the app itself resolves against, not a guess.
export async function getStudentIdByEmail(request, { teacherEmail, studentEmail }) {
  const res = await request.get(`${TEACHER_DASHBOARD_SERVICE_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}`);
  if (!res.ok()) {
    throw new Error(`GET /student/by-teacher/${teacherEmail} failed: ${res.status()}`);
  }
  const students = await res.json();
  const match = students.find((s) => s.email === studentEmail);
  if (!match) {
    throw new Error(
      `No student with email ${studentEmail} found under teacher ${teacherEmail}. ` +
        `Check the TEACHER_LINKS entry in seed-e2e-suite.js.`,
    );
  }
  return match.id;
}

// Marks a topic complete for a student, the same way the real Learn5E /
// IBPYPQuiz screens do after a passed quiz (StudentDataContext.completeLesson).
export async function completeLesson(request, studentId, { topic, subject, grade, curriculum }) {
  const res = await request.post(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/complete-lesson`, {
    data: { topic, subject, grade, curriculum },
  });
  if (!res.ok()) {
    throw new Error(`POST /student/${studentId}/complete-lesson failed: ${res.status()}`);
  }
  return res.json();
}

// Logs study time the same way a real lesson screen does while a student is
// reading/working through it (source: 'learningPath' is what updates the
// per-subject learning_path_minutes the teacher dashboard reads) - separate
// from completeLesson, which only fires once at the END of a session and
// never touches study time itself. A real student session does both.
export async function logStudyTime(request, studentId, { minutes, subject }) {
  const res = await request.post(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/study-time`, {
    data: { minutes, source: 'learningPath', subject },
  });
  if (!res.ok()) {
    throw new Error(
      `POST /student/${studentId}/study-time failed: ${res.status()} ${await res.text()}`,
    );
  }
  return res.json();
}

// Records a quiz result the same way the real NCERT/IB PYP quiz screens do
// (POST /analytics/track) - this, not complete-lesson, is what Parent
// Dashboard's Subject Performance card actually reads (routes/parent.js
// ai-report handler builds subjectPerformance from analytics events with
// eventType 'ncert_quiz_result' / 'ibpyp_quiz_result', matched by
// userEmail - confirmed via code read, complete-lesson's own topic_attempts
// insert is unrelated/unused here).
export async function trackQuizResult(
  request,
  { studentEmail, curriculum, topic, subject, score },
) {
  const eventType = curriculum === 'IB PYP' ? 'ibpyp_quiz_result' : 'ncert_quiz_result';
  const res = await request.post(BACKEND_URL + '/analytics/track', {
    data: { eventType, userEmail: studentEmail, topic, subject, score },
  });
  if (!res.ok()) {
    throw new Error(`POST /analytics/track failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Marks attendance for a student on a given date, the same way the
// teacher's attendance-marking screen does (POST /attendance/save). Upserts
// per date+studentId, so calling it twice with the same date just overwrites
// that one record rather than double-counting.
export async function markAttendance(request, { date, studentId, status }) {
  const res = await request.post(BACKEND_URL + '/attendance/save', {
    data: { date, records: { [studentId]: status } },
  });
  if (!res.ok()) {
    throw new Error(`POST /attendance/save failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Creates a quiz-type assignment for a specific student (POST /assignments).
// Uses `type: 'quiz'` with one real MCQ question, not a plain 'assignment' -
// plain assignments have NO server-side scoring path at all (routes/
// assignments.js's POST /:id/submit doesn't even read a client-supplied
// score), so an assignment-analytics test needs a quiz to get a real,
// non-null score. MCQ grading (unlike free-text) is deterministic backend
// code, not an AI call, so the outcome here is exact and not flaky.
export async function createAssignment(request, { teacherId, studentId, title, dueDate, subject }) {
  const res = await request.post(ASSIGNMENTS_SERVICE_URL + '/assignments', {
    data: {
      title,
      dueDate,
      studentId,
      createdById: teacherId,
      createdByRole: 'teacher',
      subject,
      type: 'quiz',
      quizQuestions: [
        {
          question: 'What is 7 + 5?',
          type: 'mcq',
          options: ['12', '10', '13', '11'],
          correct: '12',
        },
      ],
    },
  });
  if (!res.ok()) {
    throw new Error(`POST /assignments failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Submits the quiz as a student with the correct MCQ answer, the same way
// the real submit flow does - scores 100 deterministically (see
// createAssignment's comment on why plain assignments can't be used here).
export async function submitAssignment(request, assignmentId, { studentId }) {
  const res = await request.post(`${ASSIGNMENTS_SERVICE_URL}/assignments/${assignmentId}/submit`, {
    data: { studentId, quizAnswers: [{ answer: '12' }] },
  });
  if (!res.ok()) {
    throw new Error(
      `POST /assignments/${assignmentId}/submit failed: ${res.status()} ${await res.text()}`,
    );
  }
  return res.json();
}

// Read-only expected-value lookup: the exact same call AssignmentsScreen.tsx
// itself makes on load (GET /assignments?studentId=), used to compute real
// expected pending/completed/ready counts to compare the screen against -
// never as the test's own assertion (see CLAUDE.md's E2E Persona Rule).
export async function getAssignmentsForStudent(request, studentId) {
  const res = await request.get(`${ASSIGNMENTS_SERVICE_URL}/assignments?studentId=${studentId}`);
  if (!res.ok()) {
    throw new Error(`GET /assignments?studentId=${studentId} failed: ${res.status()}`);
  }
  return res.json();
}

// Deletes an assignment (DELETE /assignments/:id) - used for per-test
// cleanup so assignments created for one test run don't pile up on
// student-r's account across repeated runs (same convention as
// deleteScheduleEvent).
export async function deleteAssignment(request, id) {
  const res = await request.delete(`${BACKEND_URL}/assignments/${id}`);
  if (!res.ok()) {
    throw new Error(`DELETE /assignments/${id} failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Looks up a parent's linked child id by email (GET /parent/:email/children -
// the same call ParentChallengesScreen itself makes to build its child list).
export async function getChildIdByParentEmail(request, { parentEmail, childEmail }) {
  const res = await request.get(`${BACKEND_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  if (!res.ok()) {
    throw new Error(`GET /parent/${parentEmail}/children failed: ${res.status()}`);
  }
  const children = await res.json();
  const match = children.find((c) => c.email === childEmail);
  if (!match) {
    throw new Error(
      `No child with email ${childEmail} found under parent ${parentEmail}. ` +
        `Check the PARENT_LINKS entry in seed-e2e-suite.js.`,
    );
  }
  return match.id;
}

// Same lookup as getChildIdByParentEmail, but against aivorah-students-service
// (Dev DB) instead of the monolith - use this when the id will be passed to
// another Dev-DB-backed service (e.g. aivorah-parental-controls-service),
// since the monolith and Dev DB have separate `users` rows with DIFFERENT
// ids for the same test account email (confirmed via a live check
// 2026-09-03).
export async function getChildIdByParentEmailFromStudentsService(request, { parentEmail, childEmail }) {
  const res = await request.get(`${STUDENTS_SERVICE_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  if (!res.ok()) {
    throw new Error(`GET ${STUDENTS_SERVICE_URL}/parent/${parentEmail}/children failed: ${res.status()}`);
  }
  const children = await res.json();
  const match = children.find((c) => c.email === childEmail);
  if (!match) {
    throw new Error(`No child with email ${childEmail} found under parent ${parentEmail} in the Dev DB.`);
  }
  return match.id;
}

// Lists the real challenges available for a grade/curriculum - used to pick
// a real challengeId instead of guessing one. Passing studentId includes
// each challenge's assignment status for that student (GET /challenges?
// studentId=... in routes/challenges.js), so a test can pick one that
// isn't already 'completed' from a previous run - re-completing the same
// challenge_assignments row doesn't increment totals a second time.
export async function listChallenges(request, { grade, curriculum, studentId }) {
  const params = new URLSearchParams({ grade, curriculum });
  if (studentId) params.set('studentId', studentId);
  const res = await request.get(`${CHALLENGES_SERVICE_URL}/challenges?${params.toString()}`);
  if (!res.ok()) {
    throw new Error(`GET /challenges failed: ${res.status()}`);
  }
  return res.json();
}

// Lists challenges assigned to a student ACROSS ALL grades/curricula (GET
// /challenges/assigned?studentId=...) - the same second call
// ChallengesScreen.tsx's fetchChallenges() makes and merges into its
// grade-filtered list, so a challenge a parent/teacher assigned from a
// different grade still shows under the Assigned tab. Needed alongside
// listChallenges() to compute a real expected Assigned count - using
// listChallenges() alone undercounts it.
export async function listAssignedChallenges(request, { studentId }) {
  const res = await request.get(`${CHALLENGES_SERVICE_URL}/challenges/assigned?studentId=${studentId}`);
  if (!res.ok()) {
    throw new Error(`GET /challenges/assigned failed: ${res.status()}`);
  }
  return res.json();
}

// Assigns a challenge to a student, the same way a teacher's "Assign
// Challenge" flow does (POST /challenges/assign).
export async function assignChallenge(request, { challengeId, studentId, teacherId }) {
  const res = await request.post(CHALLENGES_SERVICE_URL + '/challenges/assign', {
    data: { challengeId, studentId, assignedById: teacherId, assignedByRole: 'teacher' },
  });
  if (!res.ok()) {
    throw new Error(`POST /challenges/assign failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Assigns a challenge the same way ParentChallengesScreen's "Assign to Child"
// flow does - assignedById is the parent's EMAIL, not a DB id (unlike the
// teacher flow above, ParentChallengesScreen passes `user.email` straight
// through - see doAssign in ParentChallengesScreen.tsx).
export async function assignChallengeAsParent(
  request,
  { challengeId, studentId, parentEmail, dueDate },
) {
  const res = await request.post(CHALLENGES_SERVICE_URL + '/challenges/assign', {
    data: { challengeId, studentId, assignedById: parentEmail, assignedByRole: 'parent', dueDate },
  });
  if (!res.ok()) {
    throw new Error(`POST /challenges/assign failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Directly syncs a student's stats via PUT /student/:id - the same
// full-stats-sync endpoint the app's own client tabs call whenever local
// state changes (routes/student.js). Used to set fields that no other real
// endpoint increments server-side (currentStreak, xpPoints, assignmentsDone -
// confirmed via code read: nothing else in the backend writes
// assignments_done or current_streak), so this is the real, app-native way
// to reach those values, not a fabricated shortcut.
export async function setStudentStats(request, studentId, patch) {
  const res = await request.put(`${LEADERBOARD_SERVICE_URL}/student/${studentId}`, { data: patch });
  if (!res.ok()) {
    throw new Error(`PUT /student/${studentId} failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Read-only lookup of a student's current stats row - used to snapshot a
// value BEFORE a test overwrites it via setStudentStats, so the test can
// restore it afterward instead of leaving a permanent side effect on a
// shared account.
export async function getStudentStats(request, studentId) {
  const res = await request.get(`${LEADERBOARD_SERVICE_URL}/student/${studentId}`);
  if (!res.ok()) {
    throw new Error(`GET /student/${studentId} failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Resolves a user's own DB id from their email - read-only despite the verb:
// PATCH /user/profile with no patch fields beyond `email` takes the
// "nothing to update, just fetch the existing row" branch (see routes/
// user.js), so this never writes anything. Used for accounts with no
// parent/teacher link to resolve their id through (student-j has neither -
// getChildIdByParentEmail/getStudentIdByEmail both require one).
export async function getUserIdByEmail(request, email) {
  const res = await request.patch(PROFILE_SERVICE_URL + '/user/profile', { data: { email } });
  if (!res.ok()) {
    throw new Error(`PATCH /user/profile (lookup) failed: ${res.status()} ${await res.text()}`);
  }
  const data = await res.json();
  if (!data?.id) throw new Error(`No user id returned for ${email}`);
  return data.id;
}

// Assigns a challenge the same way the STUDENT'S OWN Challenges screen does
// when auto-assigning on first "Start Challenge" tap (assignedById is the
// student's own email, assignedByRole: 'student' - see startChallenge() in
// ChallengesScreen.tsx). Also used as test setup to reset a challenge that a
// PREVIOUS run already completed back to 'assigned' - POST /challenges/assign
// resets a completed row instead of rejecting it (routes/challenges.js), so
// this keeps challenge-flow tests repeatable against the small fixed pool
// without ever needing a database wipe between runs.
export async function assignChallengeAsStudent(request, { challengeId, studentId, studentEmail }) {
  const res = await request.post(CHALLENGES_SERVICE_URL + '/challenges/assign', {
    data: { challengeId, studentId, assignedById: studentEmail, assignedByRole: 'student' },
  });
  if (!res.ok()) {
    throw new Error(`POST /challenges/assign failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Completes an assigned challenge as a student (POST /challenges/:id/complete).
export async function completeChallenge(request, assignmentId, { studentId, score }) {
  const res = await request.post(`${CHALLENGES_SERVICE_URL}/challenges/${assignmentId}/complete`, {
    data: { studentId, score },
  });
  if (!res.ok()) {
    throw new Error(
      `POST /challenges/${assignmentId}/complete failed: ${res.status()} ${await res.text()}`,
    );
  }
  return res.json();
}

// ── Schedule (tests/student/schedule/*.spec.js) ─────────────────────────────

// Creates a schedule event the same way ScheduleScreen.tsx's addEvent() does
// (POST /schedule) - used for SETUP (seeding deterministic events to filter/
// assert against), not as the thing under test. Real required fields per
// routes/schedule.js: title, date, startTime, studentId (endTime/tag/note
// are optional server-side, even though the Add Event modal's UI implies tag
// is required with its asterisk - confirmed by reading the POST handler).
export async function createScheduleEvent(
  request,
  { title, date, startTime, endTime, studentId, tag, note, type },
) {
  const res = await request.post(SCHEDULE_SERVICE_URL + '/schedule', {
    data: {
      title,
      date,
      startTime,
      endTime: endTime ?? '',
      studentId,
      createdBy: studentId,
      tag: tag ?? null,
      note: note ?? '',
      type: type ?? 'study',
    },
  });
  if (!res.ok()) {
    throw new Error(`POST /schedule failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Deletes a schedule event (DELETE /schedule/:id) - used for CLEANUP after a
// test creates one via the real UI, so events don't pile up across repeated
// runs against student-k's small fixed calendar.
export async function deleteScheduleEvent(request, id) {
  const res = await request.delete(`${SCHEDULE_SERVICE_URL}/schedule/${id}`);
  if (!res.ok()) {
    throw new Error(`DELETE /schedule/${id} failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Reads a student's real events for one day (GET /schedule) - a read-only
// expected-value lookup (see CLAUDE.md), used to compute what the UI SHOULD
// show, never as the test's own assertion.
export async function getScheduleForDate(request, { studentId, date, hideCompleted = false }) {
  const res = await request.get(
    `${SCHEDULE_SERVICE_URL}/schedule?studentId=${studentId}&date=${date}&hideCompleted=${hideCompleted}`,
  );
  if (!res.ok()) {
    throw new Error(`GET /schedule failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Reads a teacher's events for one day (GET /schedule/teacher?date=&email=) -
// TeacherScheduleScreen.tsx's own fetchEvents() call, mirrored here as a
// read-only expected-value lookup / cleanup helper for
// tests/teacher/schedule/*.spec.js. Distinct endpoint from the student
// GET /schedule?studentId= above - the teacher grid is keyed by the
// creating teacher's email, not a single student id.
export async function getTeacherScheduleForDate(request, { email, date }) {
  const res = await request.get(
    `${SCHEDULE_SERVICE_URL}/schedule/teacher?date=${date}&email=${encodeURIComponent(email)}`,
  );
  if (!res.ok()) {
    throw new Error(`GET /schedule/teacher failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// ── The World & You (tests/student/world-and-you/*.spec.js) ────────────────

// Reads a student's current xp_points (GET /student/:id) - a read-only
// expected-value lookup used to compute an XP delta around the World & You
// quiz (DailyTidbitCard.tsx's handleAnswer() POSTs to /daily-tidbit/quiz-
// complete on the last question, which adds `correct * 10` to xp_points -
// confirmed by reading routes/daily-tidbit.js directly).
//
// CAUTION: this endpoint is not purely read-only server-side - if
// last_active_date isn't today yet, it also resets today_xp/today_study_minutes
// and bumps current_streak as a side effect (confirmed by reading routes/
// student.js's GET /:id). xp_points itself is never touched by that reset
// branch, so a before/after xp_points delta is still safe and deterministic,
// but do not reuse this helper to read today_xp/current_streak expecting it
// to be side-effect-free.
export async function getStudentXp(request, studentId) {
  const res = await request.get(`${LEADERBOARD_SERVICE_URL}/student/${studentId}`);
  if (!res.ok()) {
    throw new Error(`GET /student/${studentId} failed: ${res.status()} ${await res.text()}`);
  }
  const data = await res.json();
  return data.xpPoints ?? 0;
}

// Read-only expected-value lookup: the exact same data DailyHabitsScreen.tsx
// itself fetches on load (GET /habits/today?userEmail=), used to compute
// real expected streak/coins/task-count values to compare the UI against -
// never as the test's actual assertion (see CLAUDE.md's E2E Persona Rule).
export async function getHabitsToday(request, userEmail) {
  const res = await request.get(`${BACKEND_URL}/habits/today?userEmail=${encodeURIComponent(userEmail)}`);
  if (!res.ok()) {
    throw new Error(`GET /habits/today failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Creates a real parent-assigned daily task the same way
// ParentDailyHabitsScreen's own "Add Task" flow does (POST /habits/parent-
// tasks) - setup only. Habits are parent-assigned-only (DailyHabitsScreen.tsx's
// own comment: "Parent-assigned tasks (only source of habits)"), so a
// student-side habits test has no other way to get a real habit on screen.
export async function createHabitTask(request, { parentEmail, childId, label, icon, coins }) {
  const res = await request.post(BACKEND_URL + '/habits/parent-tasks', {
    data: { parentEmail, childId, label, icon, coins },
  });
  if (!res.ok()) {
    throw new Error(`POST /habits/parent-tasks failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

// Deletes a habit task by id (POST /habits/parent-tasks/:taskId) - used for
// per-test cleanup, scoped to exactly the task(s) a given test created (same
// per-test-not-file-wide cleanup convention schedule-filters.spec.js uses,
// since this repo's fullyParallel config means other tests may be creating
// their own tasks for the same shared account at the same time).
export async function deleteHabitTask(request, taskId) {
  const res = await request.delete(`${BACKEND_URL}/habits/parent-tasks/${taskId}`);
  if (!res.ok()) {
    throw new Error(
      `DELETE /habits/parent-tasks/${taskId} failed: ${res.status()} ${await res.text()}`,
    );
  }
  return res.json();
}

// ── Teacher Assignments (tests/student/assignments/*.spec.js cross-persona test) ──

// Seeds a quiz into a teacher's Quiz Library (POST /quiz/save) - setup only,
// the same shape a real "Generate Interactive Quiz" run produces. The real
// teacher UI then does the actual assigning (Library tab -> Assign ->
// Specific student -> Publish), never this call. No DELETE /quiz/:id route
// exists server-side, so seeded library entries aren't cleaned up after the
// test - harmless clutter in teacher-d's own library, not a correctness risk.
export async function saveQuizToLibrary(request, { teacherId, title, subject, grade, curriculum }) {
  const res = await request.post(BACKEND_URL + '/quiz/save', {
    data: {
      teacherId,
      quiz: {
        title,
        subject,
        grade,
        curriculum,
        tasks: [
          {
            questions: [
              {
                question: 'What is 7 + 5?',
                type: 'mcq',
                options: ['12', '10', '13', '11'],
                correct: '12',
              },
            ],
          },
        ],
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`POST /quiz/save failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}
