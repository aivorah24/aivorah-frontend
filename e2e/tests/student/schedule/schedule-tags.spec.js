// Student Schedule - the Tag Filters side panel: expanding/collapsing it,
// and unchecking a specific tag hiding only events with that tag.
//
// Uses student-k (dedicated to tests/student/schedule/*.spec.js).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import {
  getUserIdByEmail,
  createScheduleEvent,
  deleteScheduleEvent,
  getScheduleForDate,
} from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openSchedule,
  tagFiltersToggle,
  tagFilterCheckbox,
} from '../../helpers/scheduleLocators.js';

const ACCOUNT = 'student-k';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

async function openScheduleReady(page) {
  await openSchedule(page);
  await expect(page.getByText('My Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

// Scoped narrowly to this file's own titles - see schedule-add-event.spec.js's
// comment on why a blanket 'E2E ' prefix sweep is unsafe under fullyParallel
// with a shared account.
const OWN_TITLES = new Set(['E2E Study Session Item', 'E2E Quick Task Item']);

async function cleanupE2EEvents(request) {
  const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
  const events = await getScheduleForDate(request, { studentId, date: todayISO() });
  const ours = events.filter((e) => OWN_TITLES.has(e.title));
  await Promise.all(ours.map((e) => deleteScheduleEvent(request, e.id)));
}

test.describe('Student Schedule - Tag Filters panel', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page, request }) => {
    await applySession(context, ACCOUNT);
    await cleanupE2EEvents(request);
    await openScheduleReady(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EEvents(request);
  });

  test('the panel starts collapsed and expands/collapses on click', async ({ page }) => {
    // RNW doesn't expose accessibilityState.expanded as an aria-expanded DOM
    // attribute for this component in this app build (confirmed by reading
    // the live rendered HTML) - so expand/collapse is asserted by the tag
    // list's own visibility, which is the real, functional signal anyway.
    await expect(page.getByText('ASSIGNMENT TAGS', { exact: true })).toHaveCount(0);

    await tagFiltersToggle(page).click();
    await expect(page.getByText('ASSIGNMENT TAGS', { exact: true })).toBeVisible();
    await expect(page.getByText('EVENT TAGS', { exact: true })).toBeVisible();
    await expect(tagFilterCheckbox(page, 'Study Session')).toBeVisible();

    await tagFiltersToggle(page).click();
    await expect(page.getByText('ASSIGNMENT TAGS', { exact: true })).toHaveCount(0);
  });

  test('unchecking a tag hides only events with that tag, not other tags', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);

    await createScheduleEvent(request, {
      title: 'E2E Study Session Item',
      date: todayISO(),
      startTime: '09:00',
      endTime: '09:30',
      studentId,
      tag: 'Study Session',
      type: 'study',
    });
    await createScheduleEvent(request, {
      title: 'E2E Quick Task Item',
      date: todayISO(),
      startTime: '10:00',
      endTime: '10:30',
      studentId,
      tag: 'Quick task',
      type: 'study',
    });

    await page.reload();
    await dismissAnnouncementIfPresent(page);

    const studySessionItem = page.getByText('E2E Study Session Item', { exact: true });
    const quickTaskItem = page.getByText('E2E Quick Task Item', { exact: true });
    // Extra room over the default: under this repo's parallel-test load
    // against a single local dev server, event creation + the subsequent
    // reload can take longer (same reasoning challenges.spec.js documents
    // for its own extended timeouts).
    await expect(studySessionItem).toBeVisible({ timeout: 20000 });
    await expect(quickTaskItem).toBeVisible();

    await tagFiltersToggle(page).click();
    await tagFilterCheckbox(page, 'Study Session').click();

    await expect(studySessionItem).toHaveCount(0);
    await expect(quickTaskItem).toBeVisible();

    // Re-checking brings it back.
    await tagFilterCheckbox(page, 'Study Session').click();
    await expect(studySessionItem).toBeVisible();
  });
});
