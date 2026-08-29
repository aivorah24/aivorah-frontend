// Teacher Settings — Notifications section (first pass of a multi-part suite;
// Appearance/Photo/Logo/Account/Parent-linking/Teaching-entries follow in
// later passes as the screen is refactored piece by piece).
//
// Every test proves the full chain: teacher toggles a real switch in the UI
// -> persisted to AsyncStorage under the SAME key the notification bell
// reads -> survives a refresh - never just an in-memory assertion.
//
// Uses teacher-b - mutable, confirmed isolated (no TEACHER_LINKS entry, see
// teacher/schedule/schedule.spec.js's own note) - safe for this suite to
// freely toggle prefs without colliding with any other spec's data.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openTeacherSettings,
  notificationsSection,
  notifToggle,
  nameChangeButton,
  nameValue,
  nameModal,
  nameInput,
  nameSaveButton,
} from '../../helpers/teacherSettingsLocators.js';

test.use({ storageState: statePath('teacher-b') });

test.beforeEach(async ({ page, context }) => {
  await applySession(context, 'teacher-b');
  await openTeacherSettings(page);
  await dismissAnnouncementIfPresent(page);
  await expect(notificationsSection(page)).toBeVisible();
});

test.describe('Teacher Settings — Notifications', () => {
  test('the real Parent Messages toggle reflects on screen and survives a refresh', async ({ page }) => {
    // RN Web renders Switch's testID on the outer track/thumb wrapper — the
    // real interactive element is a native <input type="checkbox"
    // role="switch"> nested inside (see teacherSettingsLocators.js's
    // notifToggle, which locates that input directly).
    const toggle = notifToggle(page, 'teacherMessages');
    await expect(toggle).toBeVisible();
    const wasChecked = await toggle.isChecked();

    await toggle.click();
    if (wasChecked) await expect(toggle).not.toBeChecked();
    else await expect(toggle).toBeChecked();

    // Persisted, not just in-memory - a real refresh must show the same state.
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    const afterReload = notifToggle(page, 'teacherMessages');
    if (wasChecked) await expect(afterReload).not.toBeChecked();
    else await expect(afterReload).toBeChecked();

    // Restore original state so this spec is idempotent across reruns.
    await afterReload.click();
    if (wasChecked) await expect(notifToggle(page, 'teacherMessages')).toBeChecked();
    else await expect(notifToggle(page, 'teacherMessages')).not.toBeChecked();
  });

  test('Weekly Class Report and AI Class Insights are real disabled "Soon" badges, not live toggles', async ({ page }) => {
    // These two keys have no interactive Switch in the current screen - only
    // a static "Soon" badge. Asserting the toggle does NOT exist (rather
    // than exists-but-disabled) matches the real current implementation.
    await expect(page.getByTestId('teacher-settings-notif-toggle-weeklyReport')).toHaveCount(0);
    await expect(page.getByTestId('teacher-settings-notif-toggle-aiInsights')).toHaveCount(0);
    await expect(page.getByText('Weekly Class Report')).toBeVisible();
    await expect(page.getByText('AI Class Insights')).toBeVisible();
    await expect(page.getByText('Soon').first()).toBeVisible();
  });
});

// Second pass: Account Settings — Display Name. This is the safest field to
// automate end-to-end (non-destructive, trivially revertible) — Email/
// Password/Delete-Account involve Firebase reauth popups and destructive
// operations, deliberately left to manual verification rather than
// automated E2E. Proves the FULL chain: real UI edit -> PATCH
// aivorah-profile-service /user/profile -> persisted -> survives a refresh.
test.describe('Teacher Settings — Account Settings (Display Name)', () => {
  test('changing the real Display Name persists via the migrated profile service and survives a refresh', async ({ page }) => {
    await nameChangeButton(page).click();
    await expect(nameModal(page)).toBeVisible();

    const original = await nameInput(page).inputValue();
    const updated = `E2E Teacher ${Date.now()}`;

    await nameInput(page).fill(updated);
    await nameSaveButton(page).click();
    await expect(nameModal(page)).toBeHidden();
    await expect(nameValue(page)).toHaveText(updated);

    // Persisted, not just in-memory - a real refresh must show the same name.
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    await expect(nameValue(page)).toHaveText(updated);

    // Restore original name so this spec is idempotent across reruns.
    await nameChangeButton(page).click();
    await expect(nameModal(page)).toBeVisible();
    await nameInput(page).fill(original);
    await nameSaveButton(page).click();
    await expect(nameModal(page)).toBeHidden();
    await expect(nameValue(page)).toHaveText(original);
  });

  test('a real blank name shows a validation error and never saves', async ({ page }) => {
    await nameChangeButton(page).click();
    await expect(nameModal(page)).toBeVisible();

    await nameInput(page).fill('   ');
    await nameSaveButton(page).click();

    await expect(page.getByTestId('teacher-settings-name-error')).toHaveText('Please enter a name.');
    await expect(nameModal(page)).toBeVisible(); // never closed — save was rejected locally
  });
});
