// Student "My Schedule" screen (ScheduleScreen.tsx) - page load, week
// navigation, mini calendar, and Today. Filters/tags/Add Event/deadlines are
// covered in the sibling schedule-*.spec.js files in this folder.
//
// Uses student-k, dedicated to tests/student/schedule/*.spec.js (see
// tests/helpers/accounts.js) so any events these specs create/delete can't
// collide with another spec's account.
//
// Date strategy: the screen's week grid always opens on the REAL current
// week (ScheduleScreen.tsx's `today = useMemo(() => new Date(), [])`), and
// there is no practical way to click-navigate to a synthetic far-future week
// (weeks only move 7 days per click). So these tests compute expected labels
// from the real "now" using the exact same Monday-start week math the screen
// itself uses (buildWeek in ScheduleScreen.tsx), rather than asserting
// against a fixed date. Both run in the same browser/machine clock, so there
// is no client/server timezone risk here (no server date is involved in any
// assertion in this file).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openSchedule,
  addEventButton,
  prevWeekButton,
  nextWeekButton,
  todayButton,
  weekLabel,
  minicalPrevMonth,
  minicalNextMonth,
  minicalDate,
  upcomingDeadlines,
} from '../../helpers/scheduleLocators.js';

const ACCOUNT = 'student-k';

const DAYS_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Mirrors ScheduleScreen.tsx's buildWeek() exactly - Monday-start week.
function buildWeek(baseDate) {
  const dow = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { day: DAYS_SHORT[i], date: d.getDate() };
  });
}

function expectedWeekLabel(baseDate) {
  const week = buildWeek(baseDate);
  return `${week[0].day} ${week[0].date} — ${week[6].day} ${week[6].date}`;
}

async function openScheduleReady(page) {
  await openSchedule(page);
  await expect(page.getByText('My Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

test.describe('Student Schedule - page load, week navigation, mini calendar', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await openScheduleReady(page);
  });

  test('page loads with heading, filter chips, week nav, and side panels', async ({ page }) => {
    await expect(page.getByText('My Schedule', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Stay organized and hit your goals.', { exact: true }),
    ).toBeVisible();

    await expect(page.getByTestId('schedule-filter-all')).toBeVisible();
    await expect(page.getByTestId('schedule-filter-assignments')).toBeVisible();
    await expect(page.getByTestId('schedule-filter-study')).toBeVisible();

    await expect(prevWeekButton(page)).toBeVisible();
    await expect(todayButton(page)).toBeVisible();
    await expect(nextWeekButton(page)).toBeVisible();
    await expect(weekLabel(page)).toHaveText(expectedWeekLabel(new Date()));

    await expect(addEventButton(page)).toBeVisible();
    await expect(page.getByText('Tag Filters', { exact: true })).toBeVisible();
    await expect(upcomingDeadlines(page)).toBeVisible();
  });

  test('Next/Previous week moves the grid by exactly 7 days and back', async ({ page }) => {
    const now = new Date();
    await expect(weekLabel(page)).toHaveText(expectedWeekLabel(now));

    await nextWeekButton(page).click();
    const nextWeekDate = new Date(now);
    nextWeekDate.setDate(now.getDate() + 7);
    await expect(weekLabel(page)).toHaveText(expectedWeekLabel(nextWeekDate));

    await prevWeekButton(page).click();
    await expect(weekLabel(page)).toHaveText(expectedWeekLabel(now));

    await prevWeekButton(page).click();
    const prevWeekDate = new Date(now);
    prevWeekDate.setDate(now.getDate() - 7);
    await expect(weekLabel(page)).toHaveText(expectedWeekLabel(prevWeekDate));
  });

  test('Today returns to the current week after navigating away', async ({ page }) => {
    const now = new Date();
    await nextWeekButton(page).click();
    await nextWeekButton(page).click();
    await expect(weekLabel(page)).not.toHaveText(expectedWeekLabel(now));

    await todayButton(page).click();
    await expect(weekLabel(page)).toHaveText(expectedWeekLabel(now));
  });

  test('mini calendar month navigation changes the displayed month/year', async ({ page }) => {
    const now = new Date();
    const monthLabel = page.getByText(`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`, {
      exact: true,
    });
    await expect(monthLabel).toBeVisible();

    await minicalNextMonth(page).click();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await expect(
      page.getByText(`${MONTH_NAMES[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`, {
        exact: true,
      }),
    ).toBeVisible();

    await minicalPrevMonth(page).click();
    await expect(monthLabel).toBeVisible();

    await minicalPrevMonth(page).click();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    await expect(
      page.getByText(`${MONTH_NAMES[prevMonthDate.getMonth()]} ${prevMonthDate.getFullYear()}`, {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("clicking a mini calendar date jumps the week grid to that date's week", async ({
    page,
  }) => {
    const now = new Date();
    // Pick a date 10 days out (a different week for any day-of-week 'now'
    // could be) so the jump is unambiguous, but stay inside the current
    // mini-calendar month view so no month navigation is needed first -
    // unless that would run past this month's end, in which case fall back
    // to a date 3 days out (still guaranteed to differ in week for most
    // days, and never crosses a month boundary).
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDay = now.getDate() + 10 <= daysInMonth ? now.getDate() + 10 : now.getDate() - 10;
    if (targetDay < 1) test.skip(true, 'no safe same-month target date this month');

    const target = new Date(now.getFullYear(), now.getMonth(), targetDay);
    const targetIso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(
      target.getDate(),
    ).padStart(2, '0')}`;

    await minicalDate(page, targetIso).click();
    await expect(weekLabel(page)).toHaveText(expectedWeekLabel(target));
  });
});
