// Verifies the Parent Dashboard doesn't break when a parent has ZERO
// children linked (a genuinely new/unlinked parent account).
//
// Confirmed via code read (ParentDashboardScreen.tsx line 457-484,
// 602/932): when children.length === 0, the "My Children" row shows only
// the "Add Child" button (no cards, no loading spinner stuck). Everything
// below it - Weekly Snapshot, Activity Overview, Learning Highlights,
// Subject Performance, Learning Mood, Achievements, AI Weekly Insight - is
// gated on `child.id`, which is falsy (EMPTY_CHILD) with no children, so
// none of those sections render at all. That's the real intended empty
// state, not a broken/half-loaded screen.
//
// Uses parent-h - read-only, deliberately has no PARENT_LINKS entry (see
// OWNERSHIP notes in accounts.js).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';

const PARENT = 'parent-h';

test.describe('Parent Dashboard - Empty State', () => {
  test.use({ storageState: statePath(PARENT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('a parent with zero children sees a clean empty state, not a crash', async ({ page }) => {
    await expect(page.getByText('Add Child', { exact: true })).toBeVisible();

    // None of the per-child sections should render - they're all gated on
    // a real selected child existing.
    await expect(page.getByText('Weekly Snapshot', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Activity Overview', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Learning Highlights', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Subject Performance', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Learning Mood', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Achievements', { exact: true })).toHaveCount(0);
    await expect(page.getByText('AI Weekly Insight', { exact: true })).toHaveCount(0);

    // The app is still interactive - a crashed React tree would leave this
    // unclickable.
    await page.getByText('Add Child', { exact: true }).click();
    await expect(page.getByText('My Kids', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
