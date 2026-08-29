// Teacher Schedule - cross-persona visibility: an event a teacher creates
// for a specific student must actually render on that STUDENT's own
// Schedule screen, not just exist as a row in the DB. This is the one place
// a second persona's real UI is the proof, per CLAUDE.md's Persona Rule
// ("API calls are allowed only for setup/read-only lookups - the tested
// persona's own dashboard must be checked via its own UI").
//
// Uses teacher-d + student-r - the existing teacher_student-linked pair
// already dedicated to cross-persona tests (see
// tests/student/assignments/assignments.spec.js, which uses this same pair
// for the analogous "teacher assigns a quiz -> student sees it" flow).
// Reused here rather than adding a new pair since the domains don't overlap
// (assignments vs schedule) and both specs already coordinate through the
// same teacher-d/student-r account-ownership note in accounts.js.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { getUserIdByEmail, getScheduleForDate, deleteScheduleEvent } from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openTeacherSchedule,
  addEventButton,
  createEventModal,
  modalTitleInput,
  modalTargetSpecificButton,
  modalStudentOption,
  modalConfirmButton,
  dayColumn as teacherDayColumn,
} from '../../helpers/teacherScheduleLocators.js';
import { openSchedule, dayColumn as studentDayColumn } from '../../helpers/scheduleLocators.js';

const TEACHER = 'teacher-d';
const STUDENT = 'student-r';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function uniqueTitle(base) {
  return `${base} ${Date.now()}`;
}

test.describe('Teacher Schedule - cross-persona visibility', () => {
  test('an event the teacher assigns to a specific student appears on that student\'s own Schedule screen', async ({
    browser,
    request,
  }) => {
    const title = uniqueTitle('E2E Cross-Persona Schedule Event');
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getUserIdByEmail(request, studentEmail);

    // Cleanup any leftover row from a prior failed run before starting.
    const cleanup = async () => {
      const events = await getScheduleForDate(request, { studentId, date: todayISO() });
      const ours = events.filter((e) => e.title === title);
      await Promise.all(ours.map((e) => deleteScheduleEvent(request, e.id)));
    };
    await cleanup();

    // ── Teacher's own browser context: create the event via the real UI ──
    const teacherContext = await browser.newContext({ storageState: statePath(TEACHER) });
    const teacherPage = await teacherContext.newPage();
    await applySession(teacherContext, TEACHER);
    await openTeacherSchedule(teacherPage);
    await expect(teacherPage.getByText('Class Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(teacherPage);

    await addEventButton(teacherPage).click();
    await expect(createEventModal(teacherPage)).toBeVisible();
    await modalTitleInput(teacherPage).fill(title);

    await modalTargetSpecificButton(teacherPage).click();
    // Select by the real studentId (looked up via a read-only API call
    // above), not by display name - the student picker's own row testID is
    // keyed by id (`teacher-schedule-modal-student-${s.id}`), same pattern
    // Teacher Assignments already uses for the same reason (unknown/unstable
    // display name, see assignments.spec.js's teacher-assign-student-row-*).
    await modalStudentOption(teacherPage, studentId).click();

    await modalConfirmButton(teacherPage).click();
    await expect(createEventModal(teacherPage)).toBeHidden({ timeout: 15000 });

    await expect(teacherDayColumn(teacherPage, todayISO()).getByText(title, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await teacherContext.close();

    // Read-only expected-value lookup: confirm the backend really did save
    // it against student-r's id (not the teacher's own final assertion).
    const events = await getScheduleForDate(request, { studentId, date: todayISO() });
    const matches = events.filter((e) => e.title === title);
    expect(matches, 'expected exactly one event created for this student').toHaveLength(1);
    expect(matches[0].studentId).toBe(studentId);

    // ── Student's own browser context: the actual proof ──
    const studentContext = await browser.newContext({ storageState: statePath(STUDENT) });
    const studentPage = await studentContext.newPage();
    await applySession(studentContext, STUDENT);
    await openSchedule(studentPage);
    await expect(studentPage.getByText('My Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(studentPage);

    await expect(studentDayColumn(studentPage, todayISO()).getByText(title, { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await studentContext.close();

    await cleanup();
  });
});
