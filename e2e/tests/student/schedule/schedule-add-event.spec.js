// Student Schedule - the Add Event modal: opening it (via the page button
// and via clicking an empty hour slot), Cancel, client-side validation,
// creating a timed event, creating an all-day event, and persistence after
// a page refresh.
//
// Every test proves the full chain: user action -> API/state change (or
// deliberately no change) -> correct Schedule placement -> persistence
// after refresh, not just that a title string appears somewhere on the
// page. API calls here are either SETUP or read-only expected-value
// lookups (per CLAUDE.md) - the final assertion is always what's rendered.
//
// Uses student-k (dedicated to tests/student/schedule/*.spec.js). Every test
// that creates an event cleans it up in afterEach via the API (deleteScheduleEvent),
// so this file's small fixed set of titles stays reusable across repeated runs
// without a database wipe - same approach challenges.spec.js uses for its pool.
//
// Events are created on TODAY (the Add Event button defaults modalDate to the
// real current date, same as the screen's own default) - see schedule.spec.js's
// header comment for why a fixed far-future date isn't practical here.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { getUserIdByEmail, getScheduleForDate, deleteScheduleEvent } from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openSchedule,
  addEventButton,
  addEventModal,
  modalTitleInput,
  modalNoteInput,
  modalTagChip,
  modalAllDayCheckbox,
  modalCancelButton,
  modalConfirmButton,
  startTimePicker,
  endTimePicker,
  timePickerOption,
  dayColumn,
  allDayColumn,
  hourSlot,
} from '../../helpers/scheduleLocators.js';

const ACCOUNT = 'student-k';

// HOUR_HEIGHT and calcEventTop() from ScheduleScreen.tsx - the grid renders
// each timed event at `top: (hour - TIMELINE_START_HOUR) * HOUR_HEIGHT`
// (TIMELINE_START_HOUR is 0, i.e. the grid starts at 00:00). Mirrored here so
// the test can prove an event is positioned at the RIGHT hour, not just that
// its time label text says the right thing.
const HOUR_HEIGHT = 56;
function expectedTopPx(startTime24) {
  const [h, m] = startTime24.split(':').map(Number);
  return h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// '08:00' -> '8:00 AM' etc. - mirrors TimePicker.tsx's to12h().
function to12h(time24) {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr} ${period}`;
}

async function openScheduleReady(page) {
  await openSchedule(page);
  await expect(page.getByText('My Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

// Deletes only the exact titles passed in, scoped PER TEST. student-k is
// shared across every test in every file under tests/student/schedule/, and
// playwright.config.js runs fullyParallel - a cleanup keyed off a
// file-wide title set would let one test's beforeEach/afterEach delete
// another concurrently-running test's just-created event, in this file or
// any other (confirmed as a real, reproducible flake during this suite's
// own development - not a hypothetical).
async function cleanupTitles(request, titles) {
  const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
  const events = await getScheduleForDate(request, { studentId, date: todayISO() });
  const ours = events.filter((e) => titles.has(e.title));
  await Promise.all(ours.map((e) => deleteScheduleEvent(request, e.id)));
}

// Unique per test run so a failed prior run's leftover row (if cleanup ever
// didn't fire) can never be mistaken for a fresh creation in this run.
function uniqueTitle(base) {
  return `${base} ${Date.now()}`;
}

test.describe('Student Schedule - Add Event modal', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await openScheduleReady(page);
  });

  test('Add Event button opens the modal, Cancel closes it without creating anything', async ({
    page,
    request,
  }) => {
    const title = uniqueTitle('E2E Cancelled Event');
    // Watch the network directly - Cancel must never even attempt a
    // POST /schedule. This is stronger proof than "the row doesn't exist
    // afterwards", which a slow/failed create could also produce.
    const createRequests = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/schedule')) createRequests.push(req);
    });

    await addEventButton(page).click();
    await expect(addEventModal(page)).toBeVisible();
    await expect(page.getByText(`Add Event — ${todayISO()}`, { exact: true })).toBeVisible();

    await modalTitleInput(page).fill(title);
    await modalCancelButton(page).click();
    await expect(addEventModal(page)).toBeHidden({ timeout: 15000 });

    expect(createRequests, 'Cancel must not fire a POST /schedule request').toHaveLength(0);

    // Read-only expected-value lookup: confirm the backend genuinely has no
    // row for this title (not just that the UI didn't render one).
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const events = await getScheduleForDate(request, { studentId, date: todayISO() });
    expect(events.some((e) => e.title === title)).toBe(false);

    // Final assertion is UI-based: the title never appears anywhere on the
    // schedule screen either.
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
    await expect(addEventModal(page)).toBeVisible();

    await modalConfirmButton(page).click();
    // addEvent() returns immediately when title is blank - the modal never
    // closes, no save happens.
    await expect(addEventModal(page)).toBeVisible();

    expect(
      createRequests,
      'blank-title Confirm must not fire a POST /schedule request (client-side validation should stop it before the network call)',
    ).toHaveLength(0);

    await modalCancelButton(page).click();
    await expect(addEventModal(page)).toBeHidden({ timeout: 15000 });

    // No blank-titled row should exist for today at all.
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const events = await getScheduleForDate(request, { studentId, date: todayISO() });
    expect(events.some((e) => !e.title || !e.title.trim())).toBe(false);
  });

  test('creating a timed event is saved, appears on the correct date and time slot in the grid, and survives a refresh', async ({
    page,
    request,
  }) => {
    const title = uniqueTitle('E2E Timed Event');
    const titles = new Set([title]);
    await cleanupTitles(request, titles);

    await addEventButton(page).click();
    await expect(addEventModal(page)).toBeVisible();

    await modalTitleInput(page).fill(title);
    await modalNoteInput(page).fill('E2E note text');
    await modalTagChip(page, 'Study Session').click();

    // Explicitly drive the Start/End TimePickers rather than relying on the
    // modal's default 09:00-10:00, so the test proves the actual picker
    // interaction sets 09:00-10:00, not just that it happened to match the
    // default state.
    await startTimePicker(page).click();
    await timePickerOption(startTimePicker(page), to12h('09:00')).click();
    await endTimePicker(page).click();
    await timePickerOption(endTimePicker(page), to12h('10:00')).click();

    await modalConfirmButton(page).click();
    await expect(addEventModal(page)).toBeHidden({ timeout: 15000 });

    // 1) Proves the event was actually CREATED (backend has exactly one row
    // with this title, on today's date, with the exact time we set) - a
    // read-only expected-value lookup, not the test's final assertion.
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const events = await getScheduleForDate(request, { studentId, date: todayISO() });
    const matches = events.filter((e) => e.title === title);
    expect(matches, 'expected exactly one created event with this title').toHaveLength(1);
    expect(matches[0].date).toBe(todayISO());
    expect(matches[0].startTime).toBe('09:00');
    expect(matches[0].endTime).toBe('10:00');

    // 2) Proves it appears in the Schedule UI, ON THE CORRECT DATE COLUMN.
    const column = dayColumn(page, todayISO());
    const block = column.getByText(title, { exact: true });
    await expect(block).toBeVisible({ timeout: 10000 });
    // Its time label, scoped to this event's own block container (a
    // page-wide time match is ambiguous whenever another event happens to
    // share the same 09:00-10:00 slot).
    await expect(
      block.locator('xpath=..').getByText('09:00–10:00', { exact: true }),
    ).toBeVisible();

    // 3) Proves it's actually POSITIONED at 09:00, not just labelled 09:00 -
    // the grid renders each event with an absolute pixel offset computed
    // from its startTime (calcEventTop() in ScheduleScreen.tsx). Compare the
    // block's offset from the top of its day column against that formula.
    const columnBox = await column.boundingBox();
    const blockBox = await block.locator('xpath=..').boundingBox();
    expect(columnBox, 'day column must be visible to measure position').toBeTruthy();
    expect(blockBox, 'event block must be visible to measure position').toBeTruthy();
    const actualTop = blockBox.y - columnBox.y;
    expect(actualTop).toBeGreaterThanOrEqual(expectedTopPx('09:00') - 3);
    expect(actualTop).toBeLessThanOrEqual(expectedTopPx('09:00') + 3);

    // 4) Proves persistence: reload and re-check date, time text, AND grid
    // position all over again from a cold load - not just "still visible".
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    const columnAfter = dayColumn(page, todayISO());
    const blockAfter = columnAfter.getByText(title, { exact: true });
    await expect(blockAfter).toBeVisible({ timeout: 15000 });
    await expect(
      blockAfter.locator('xpath=..').getByText('09:00–10:00', { exact: true }),
    ).toBeVisible();
    const columnBoxAfter = await columnAfter.boundingBox();
    const blockBoxAfter = await blockAfter.locator('xpath=..').boundingBox();
    const actualTopAfter = blockBoxAfter.y - columnBoxAfter.y;
    expect(actualTopAfter).toBeGreaterThanOrEqual(expectedTopPx('09:00') - 3);
    expect(actualTopAfter).toBeLessThanOrEqual(expectedTopPx('09:00') + 3);

    await cleanupTitles(request, titles);
  });

  test('creating an all-day event flips the checkbox state, hides the time pickers, saves as an all-day row item (not in the hourly grid), and survives a refresh', async ({
    page,
    request,
  }) => {
    const title = uniqueTitle('E2E Allday Event');
    const titles = new Set([title]);
    await cleanupTitles(request, titles);

    await addEventButton(page).click();
    await expect(addEventModal(page)).toBeVisible();

    await modalTitleInput(page).fill(title);

    const checkbox = modalAllDayCheckbox(page);
    // The 20x20 box with the isAllDay-dependent backgroundColor is the
    // inner <View>, not the outer TouchableOpacity the testID sits on
    // (which also wraps the label text) - scope to that inner box.
    const checkboxBox = checkbox.locator('div').first();
    // Before: unchecked - the source renders backgroundColor: 'transparent'
    // when isAllDay is false. (Feather icons render as an icon-font glyph on
    // RNW web, not an <svg> node, so the icon itself isn't a usable
    // selector here - confirmed by reading the live rendered HTML; the
    // background-color flip is the real, reliable DOM signal.)
    await expect(checkboxBox).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    await checkbox.click();

    // After: RNW doesn't expose accessibilityState.checked as an
    // aria-checked DOM attribute in this app build (confirmed by reading
    // the live rendered HTML), so the real, functional proof of the state
    // change is the visible style flip the source ties to isAllDay -
    // background goes from transparent to the accent color.
    await expect(checkboxBox).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    // Time pickers must be gone entirely for an all-day event.
    await expect(startTimePicker(page)).toHaveCount(0);
    await expect(endTimePicker(page)).toHaveCount(0);

    await modalConfirmButton(page).click();
    await expect(addEventModal(page)).toBeHidden({ timeout: 15000 });

    // Read-only expected-value lookup: an all-day event is stored with
    // startTime/endTime '23:59' (openSlotModal's presetAllDay branch and the
    // checkbox's own onPress both set this - confirmed by reading the
    // source), not a separate boolean column.
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const events = await getScheduleForDate(request, { studentId, date: todayISO() });
    const matches = events.filter((e) => e.title === title);
    expect(matches, 'expected exactly one created all-day event with this title').toHaveLength(1);
    expect(matches[0].startTime).toBe('23:59');

    // UI: appears in the All-day row for today...
    const allDayCol = allDayColumn(page, todayISO());
    await expect(allDayCol.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });

    // ...and does NOT appear as a timed block in the hourly grid for today
    // (ScheduleScreen.tsx's timed-grid `dayEvents` filter explicitly drops
    // any event with startTime === '23:59').
    await expect(dayColumn(page, todayISO()).getByText(title, { exact: true })).toHaveCount(0);

    // Persistence: reload and re-check both placements from a cold load.
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    await expect(allDayColumn(page, todayISO()).getByText(title, { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(dayColumn(page, todayISO()).getByText(title, { exact: true })).toHaveCount(0);

    await cleanupTitles(request, titles);
  });

  test("clicking an empty hour slot opens the modal pre-filled with that slot's date and time", async ({
    page,
  }) => {
    const iso = todayISO();
    await expect(dayColumn(page, iso)).toBeVisible({ timeout: 10000 });

    // openSlotModal(iso, '14:00') is only reachable by clicking the 14:00
    // slot specifically - hourSlot(page, iso, '14') targets that exact cell.
    await hourSlot(page, iso, '14').click();
    await expect(addEventModal(page)).toBeVisible();

    // Date pre-fill: must be today's date, not some other day.
    await expect(page.getByText(`Add Event — ${iso}`, { exact: true })).toBeVisible();

    // Start time pre-fill: openSlotModal() sets start=14:00 for a plain
    // click on the 14:00 slot.
    await expect(startTimePicker(page).getByText(to12h('14:00'), { exact: true })).toBeVisible();
    // End time pre-fill: openSlotModal() sets end = start + 1hr = 15:00 for
    // a plain click (not a drag) - confirmed by reading the source.
    await expect(endTimePicker(page).getByText(to12h('15:00'), { exact: true })).toBeVisible();

    await modalCancelButton(page).click();
    await expect(addEventModal(page)).toBeHidden({ timeout: 15000 });
  });
});
