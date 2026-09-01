// Teacher Schedule ("Class Schedule") - page load, week navigation, and the
// Create/Edit Event modal's full CRUD + validation flow.
//
// Every test proves the full chain: teacher clicks in the real UI -> API
// state change (or deliberately none) -> correct grid placement -> survives
// a refresh - never an API response as the final assertion (CLAUDE.md's
// Persona Rule).
//
// Uses teacher-b - mutable, confirmed to have no TEACHER_LINKS entry (see
// dashboard-empty-state.spec.js's own note), so its schedule is fully
// isolated from every other teacher-dashboard/assignments spec's data.
// Not shared with any OTHER schedule test file, so no account-isolation
// split was needed beyond that.
//
// timezoneId pinned to Asia/Kolkata: TeacherScheduleScreen.tsx computes
// today's date/hour/drag math off the browser's local `new Date()` (the
// "GMT+05:30" header text is a static label, not an actual conversion) - if
// the runner's OS/CI timezone differs, day-column and hour-slot math would
// silently be offset. See teacher-schedule follow-up spec for drag tests,
// which need this most.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { getTeacherIdByEmail } from '../../helpers/api.js';
import { getTeacherScheduleForDate, deleteScheduleEvent } from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openTeacherSchedule,
  addEventButton,
  prevWeekButton,
  nextWeekButton,
  todayButton,
  weekLabel,
  dayColumn,
  allDayColumn,
  hourSlot,
  createEventModal,
  modalTitleInput,
  modalNoteInput,
  modalTagChip,
  modalAllDayCheckbox,
  modalCancelButton,
  modalConfirmButton,
  startTimePicker,
  endTimePicker,
  timePickerOption,
  eventBlockByTitle,
  eventDetailModal,
  editEventButton,
  deleteEventButton,
  closeDetailButton,
  tagFiltersToggle,
  tagFilterCheckbox,
} from '../../helpers/teacherScheduleLocators.js';

const ACCOUNT = 'teacher-b';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function to12h(time24) {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${period}`;
}

function uniqueTitle(base) {
  return `${base} ${Date.now()}`;
}

async function openScheduleReady(page) {
  await openTeacherSchedule(page);
  await expect(page.getByText('Class Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

// Deletes only the exact titles passed in, scoped PER TEST - teacher-b's
// events are queried by teacher email, so a file-wide cleanup keyed off a
// wider window could race a concurrently running test in this same file
// under fullyParallel (same reasoning as the student schedule suite's
// cleanupTitles()).
async function cleanupTitles(request, titles) {
  const email = accountFor(ACCOUNT).email;
  const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
  const ours = events.filter((e) => titles.has(e.title));
  await Promise.all(ours.map((e) => deleteScheduleEvent(request, e.id)));
}

test.describe('Teacher Schedule', () => {
  test.use({ storageState: statePath(ACCOUNT), timezoneId: 'Asia/Kolkata' });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await openScheduleReady(page);
  });

  test.describe('Load & Week Navigation', () => {
    test('page loads with the current week, today highlighted, and core sections visible', async ({
      page,
    }) => {
      await expect(page.getByText('Class Schedule', { exact: true })).toBeVisible();
      await expect(page.getByText('Create sessions and deadlines for students.')).toBeVisible();
      await expect(weekLabel(page)).toBeVisible();
      await expect(dayColumn(page, todayISO())).toBeVisible();
      await expect(page.getByText('Tag Filters', { exact: true })).toBeVisible();
    });

    test('prev/next week arrows change the visible week label, Today returns to the current week', async ({
      page,
    }) => {
      const initialLabel = await weekLabel(page).innerText();

      await nextWeekButton(page).click();
      await expect(weekLabel(page)).not.toHaveText(initialLabel);
      const nextLabel = await weekLabel(page).innerText();

      await prevWeekButton(page).click();
      await prevWeekButton(page).click();
      await expect(weekLabel(page)).not.toHaveText(nextLabel);
      await expect(weekLabel(page)).not.toHaveText(initialLabel);

      await todayButton(page).click();
      await expect(weekLabel(page)).toHaveText(initialLabel);
      await expect(dayColumn(page, todayISO())).toBeVisible();
    });
  });

  test.describe('Create Event modal', () => {
    test('New Event button opens the modal, Cancel closes it without creating anything', async ({
      page,
      request,
    }) => {
      const title = uniqueTitle('E2E Teacher Cancelled Event');
      const createRequests = [];
      page.on('request', (req) => {
        if (req.method() === 'POST' && req.url().includes('/schedule')) createRequests.push(req);
      });

      await addEventButton(page).click();
      await expect(createEventModal(page)).toBeVisible();
      await expect(page.getByText(`Create Event — ${todayISO()}`, { exact: true })).toBeVisible();

      await modalTitleInput(page).fill(title);
      await modalCancelButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      expect(createRequests, 'Cancel must not fire a POST /schedule request').toHaveLength(0);

      const email = accountFor(ACCOUNT).email;
      const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
      expect(events.some((e) => e.title === title)).toBe(false);
      await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    });

    test('Confirm does nothing while the title is empty (client-side validation)', async ({
      page,
      request,
    }) => {
      const createRequests = [];
      page.on('request', (req) => {
        if (req.method() === 'POST' && req.url().includes('/schedule')) createRequests.push(req);
      });

      await addEventButton(page).click();
      await expect(createEventModal(page)).toBeVisible();

      await modalConfirmButton(page).click();
      // saveEvent() returns immediately when title is blank - the modal
      // never closes, no save happens.
      await expect(createEventModal(page)).toBeVisible();

      expect(
        createRequests,
        'blank-title Confirm must not fire a POST /schedule request',
      ).toHaveLength(0);

      await modalCancelButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      const email = accountFor(ACCOUNT).email;
      const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
      expect(events.some((e) => !e.title || !e.title.trim())).toBe(false);
    });

    test('creating a timed event assigned to All Students is saved, appears in the correct slot, and survives a refresh', async ({
      page,
      request,
    }) => {
      const title = uniqueTitle('E2E Teacher Timed Event');
      const titles = new Set([title]);
      await cleanupTitles(request, titles);

      await addEventButton(page).click();
      await expect(createEventModal(page)).toBeVisible();

      await modalTitleInput(page).fill(title);
      await modalNoteInput(page).fill('E2E note for students');
      await modalTagChip(page, 'Study Session').click();

      await startTimePicker(page).click();
      await timePickerOption(startTimePicker(page), to12h('09:00')).click();
      await endTimePicker(page).click();
      await timePickerOption(endTimePicker(page), to12h('10:00')).click();

      // Default target is "All students" - explicitly leaving it untouched
      // here proves that default, not just that some studentId got saved.
      await modalConfirmButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      const email = accountFor(ACCOUNT).email;
      const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
      const matches = events.filter((e) => e.title === title);
      expect(matches, 'expected exactly one created event with this title').toHaveLength(1);
      expect(matches[0].startTime).toBe('09:00');
      expect(matches[0].endTime).toBe('10:00');
      expect(matches[0].studentId).toBe('all');

      const column = dayColumn(page, todayISO());
      await expect(column.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(column.getByText('09:00–10:00', { exact: true })).toBeVisible();
      await expect(column.getByText('All students', { exact: true })).toBeVisible();

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      const columnAfter = dayColumn(page, todayISO());
      await expect(columnAfter.getByText(title, { exact: true })).toBeVisible({ timeout: 15000 });

      await cleanupTitles(request, titles);
    });

    test('creating an all-day event flips the checkbox, hides time pickers, saves into the all-day lane (not the hourly grid), and survives a refresh', async ({
      page,
      request,
    }) => {
      const title = uniqueTitle('E2E Teacher Allday Event');
      const titles = new Set([title]);
      await cleanupTitles(request, titles);

      await addEventButton(page).click();
      await expect(createEventModal(page)).toBeVisible();
      await modalTitleInput(page).fill(title);

      const checkbox = modalAllDayCheckbox(page);
      const checkboxBox = checkbox.locator('div').first();
      await expect(checkboxBox).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

      await checkbox.click();
      await expect(checkboxBox).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

      await expect(startTimePicker(page)).toHaveCount(0);
      await expect(endTimePicker(page)).toHaveCount(0);

      await modalConfirmButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      const email = accountFor(ACCOUNT).email;
      const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
      const matches = events.filter((e) => e.title === title);
      expect(matches, 'expected exactly one created all-day event with this title').toHaveLength(1);
      expect(matches[0].startTime).toBe('23:59');

      const allDayCol = allDayColumn(page, todayISO());
      await expect(allDayCol.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(dayColumn(page, todayISO()).getByText(title, { exact: true })).toHaveCount(0);

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      await expect(allDayColumn(page, todayISO()).getByText(title, { exact: true })).toBeVisible({
        timeout: 15000,
      });

      await cleanupTitles(request, titles);
    });

    test("clicking an empty hour slot opens the modal pre-filled with that slot's date and time", async ({
      page,
    }) => {
      const iso = todayISO();
      await expect(dayColumn(page, iso)).toBeVisible({ timeout: 10000 });

      await hourSlot(page, iso, '14').click();
      await expect(createEventModal(page)).toBeVisible();
      await expect(page.getByText(`Create Event — ${iso}`, { exact: true })).toBeVisible();

      // openModal(iso, '14:00') sets start=14:00, end=15:00 for a plain
      // click (not a drag) - see TeacherScheduleScreen.tsx's openModal().
      await expect(startTimePicker(page).getByText(to12h('14:00'), { exact: true })).toBeVisible();
      await expect(endTimePicker(page).getByText(to12h('15:00'), { exact: true })).toBeVisible();

      await modalCancelButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });
    });
  });

  test.describe('Edit & Delete', () => {
    test('editing an existing event via the detail modal updates its title/time and reflects in the grid', async ({
      page,
      request,
    }) => {
      const title = uniqueTitle('E2E Teacher Edit Source');
      const newTitle = uniqueTitle('E2E Teacher Edit Target');
      const titles = new Set([title, newTitle]);
      await cleanupTitles(request, titles);

      // Setup: create the event to edit via the real UI (proves create still
      // works, and gives this test full control of the starting state).
      await addEventButton(page).click();
      await modalTitleInput(page).fill(title);
      await startTimePicker(page).click();
      await timePickerOption(startTimePicker(page), to12h('09:00')).click();
      await endTimePicker(page).click();
      await timePickerOption(endTimePicker(page), to12h('10:00')).click();
      await modalConfirmButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      const column = dayColumn(page, todayISO());
      await eventBlockByTitle(page, title).click();
      await expect(eventDetailModal(page)).toBeVisible();

      await editEventButton(page).click();
      await expect(createEventModal(page)).toBeVisible();
      await expect(modalTitleInput(page)).toHaveValue(title);

      await modalTitleInput(page).fill('');
      await modalTitleInput(page).fill(newTitle);
      await modalConfirmButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      const email = accountFor(ACCOUNT).email;
      const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
      expect(events.some((e) => e.title === title)).toBe(false);
      const updated = events.filter((e) => e.title === newTitle);
      expect(updated, 'edited event should now have the new title, not a duplicate').toHaveLength(1);

      await expect(column.getByText(newTitle, { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(column.getByText(title, { exact: true })).toHaveCount(0);

      await cleanupTitles(request, titles);
    });

    test('deleting an event via the detail modal trash icon removes it from the grid and persists after refresh', async ({
      page,
      request,
    }) => {
      const title = uniqueTitle('E2E Teacher Delete Via Modal');
      const titles = new Set([title]);
      await cleanupTitles(request, titles);

      await addEventButton(page).click();
      await modalTitleInput(page).fill(title);
      await modalConfirmButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      await eventBlockByTitle(page, title).click();
      await expect(eventDetailModal(page)).toBeVisible();

      // confirmDeleteEvent() uses window.confirm() on web - auto-accept it.
      page.once('dialog', (dialog) => dialog.accept());
      await deleteEventButton(page).click();
      await expect(eventDetailModal(page)).toBeHidden({ timeout: 15000 });

      await expect(dayColumn(page, todayISO()).getByText(title, { exact: true })).toHaveCount(0);

      const email = accountFor(ACCOUNT).email;
      const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
      expect(events.some((e) => e.title === title)).toBe(false);

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      await expect(dayColumn(page, todayISO()).getByText(title, { exact: true })).toHaveCount(0);
    });

    test('deleting an event via its own "x" button (no detail modal) removes it immediately', async ({
      page,
      request,
    }) => {
      const title = uniqueTitle('E2E Teacher Delete Via X');
      const titles = new Set([title]);
      await cleanupTitles(request, titles);

      await addEventButton(page).click();
      await modalTitleInput(page).fill(title);
      await modalConfirmButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      const block = eventBlockByTitle(page, title);
      await expect(block).toBeVisible({ timeout: 10000 });
      // The delete "x" is an absolutely-positioned child div inside the
      // event block itself (data-delbtn="1") - scope to the block's own
      // container, not a page-wide match, since multiple events can each
      // carry their own delete button simultaneously.
      const eventContainer = block.locator('xpath=ancestor::div[@data-eid][1]');
      await eventContainer.locator('[data-delbtn]').click();

      await expect(page.getByText(title, { exact: true })).toHaveCount(0);

      const email = accountFor(ACCOUNT).email;
      const events = await getTeacherScheduleForDate(request, { email, date: todayISO() });
      expect(events.some((e) => e.title === title)).toBe(false);
    });
  });

  test.describe('Tag Filters', () => {
    // passesTagFilter() in TeacherScheduleScreen.tsx hides an event from the
    // grid the moment its own tag's checkbox is unchecked - proven here by
    // toggling one specific tag off/on around a real seeded event, not just
    // asserting the checkbox's own visual state.
    test('unchecking an event\'s tag hides it from the grid; rechecking shows it again', async ({
      page,
      request,
    }) => {
      const title = uniqueTitle('E2E Teacher Tag Filter Event');
      const titles = new Set([title]);
      await cleanupTitles(request, titles);

      await addEventButton(page).click();
      await modalTitleInput(page).fill(title);
      await modalTagChip(page, 'Study Session').click();
      await modalConfirmButton(page).click();
      await expect(createEventModal(page)).toBeHidden({ timeout: 15000 });

      const column = dayColumn(page, todayISO());
      await expect(column.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });

      await tagFiltersToggle(page).click();
      await expect(tagFilterCheckbox(page, 'Study Session')).toBeVisible();

      await tagFilterCheckbox(page, 'Study Session').click();
      await expect(column.getByText(title, { exact: true })).toHaveCount(0);

      await tagFilterCheckbox(page, 'Study Session').click();
      await expect(column.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });

      await cleanupTitles(request, titles);
    });
  });
});
