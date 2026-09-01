// Feature: AI Teaching Insights - the 3-column card (Learning Path /
// Assignments / Challenges) on the Teacher Dashboard that surfaces
// recommended actions and per-stream stats as clickable tiles.
//
// This is a DIFFERENT card from "Class Progress" (the donut + 3 progress
// bars) - see ../class-progress/. Both are driven by the same backend
// totals, but they're separate UI capabilities: Class Progress shows
// aggregate completion %, AI Insights shows actionable recommendations
// (e.g. "3 students need support") with drill-down detail per tile.
//
// Uses teacher-a - read-only, so any number of tests/specs can share it.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';

const ACCOUNT = 'teacher-a';

test.describe('Teacher Dashboard - AI Teaching Insights', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  // The three insight sections (Learning Path / Assignments / Challenges)
  // are always-visible columns, not switchable tabs - there's no tab UI
  // wired up in the app despite an unused insightFilter state existing.
  test('shows all three sections: Learning Path, Assignments, Challenges', async ({ page }) => {
    // Same duplicate-layout issue documented in the student dashboard spec
    // (mobile + desktop copies both present in the DOM) - ask only for the
    // first match rather than assuming there's just one.
    await expect(page.getByText('AI Teaching Insights')).toBeVisible();
    await expect(page.getByText('Learning Path', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Assignments', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Challenges', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });

  // The "Need Support" tile's title text is static (unlike most other
  // tiles, whose title/body change with data), so it's a reliable target:
  // one copy in the insight row, a second identical copy becomes visible
  // as the modal heading once opened - no testID or dialog role needed.
  test('clicking the Need Support tile opens its detail modal, and it can be closed', async ({ page }) => {
    const needSupportText = page.getByText('Need Support', { exact: true }).filter({ visible: true });
    await expect(needSupportText).toHaveCount(1);

    await needSupportText.click();

    await expect(needSupportText).toHaveCount(2);
    await expect(page.getByText('Student', { exact: true }).filter({ visible: true })).toBeVisible();

    // The close (x) button is the icon-only element right after the
    // heading's text wrapper - see TeacherDashboardScreen modalHeader.
    await needSupportText.last().locator('xpath=../following-sibling::*[1]').click();
    await expect(needSupportText).toHaveCount(1);
  });
});
