// Verifies the Parent Dashboard degrades gracefully when its own data fetch
// fails - it must NOT crash or hang, even though there's no visible error
// banner anywhere on this screen (see ParentDashboardScreen.tsx's
// loadChildren: `.catch(() => {})` silently swallows the error, and
// `.finally(() => setChildrenLoading(false))` always turns the spinner off
// regardless of success/failure). This test is written for that ACTUAL
// behavior, not an idealized error banner that doesn't exist.
//
// Uses parent-h (read-only) - this test only intercepts network requests in
// its own browser context, it never mutates the account.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';

const PARENT = 'parent-h';

test.describe('Parent Dashboard - Error State', () => {
  test.use({ storageState: statePath(PARENT) });

  test('a failed children fetch shows a clean empty state instead of crashing', async ({
    context,
    page,
  }) => {
    // The only data call this screen makes before a child is even selected
    // (ParentDashboardScreen.tsx line 280, loadChildren).
    await context.route('**/parent/**/children', (route) => route.abort('failed'));

    await applySession(context, PARENT);
    await page.goto('/');

    // "My Children" itself doesn't depend on the fetch resolving (it's a
    // static section title), so it should still render.
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });

    // childrenLoading is turned off unconditionally in `finally`, even on
    // failure - the screen must settle on the same empty state as a
    // genuinely-zero-children account, not hang on a stuck spinner.
    await expect(page.getByText('Add Child', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Weekly Snapshot', { exact: false })).toHaveCount(0);

    // No uncaught exception should have torn down the page - the app is
    // still interactive (a crashed React tree would leave this unclickable).
    await page.getByText('Add Child', { exact: true }).click();
    await expect(page.getByText('My Kids', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
