// Feature: Switch Profile — a teacher who is also a parent (her own child
// studies at the same school) can add a parent profile from her teacher
// account, complete parent onboarding for that child, and switch back and
// forth between her Teacher and Parent dashboards afterward.
//
// Real user journey (confirmed with Sai before writing this):
//   1. Teacher logs in — single role, sees "Also a parent?" in the sidebar.
//   2. Taps it -> real parent-onboarding form (OnboardingParentBoxes.tsx).
//   3. Fills her own info + adds a child UNDER 14 (auto-created student
//      account — no OTP/email-verification flow, unlike the 14+ "link an
//      existing account" path, which this spec deliberately doesn't cover;
//      no OTP-reading mechanism exists anywhere in this suite yet).
//   4. Completes setup -> lands on the real Parent Dashboard.
//   5. "Switch Profile" pills now appear (dual-role) -> switching to
//      Teacher lands back on the real Teacher Dashboard, and back to
//      Parent again proves the switch is bidirectional, not one-way.
//
// Account: teacher-g (dedicated, mutable — this test PERMANENTLY converts
// it from single-role to dual-role; see OWNERSHIP notes in accounts.js).
// The account's own `role`/`user_preferences` are restored automatically by
// the suite's global teardown (every mutable account is snapshotted before
// the run and restored after — see runSetup.js/resetProfile.js). The CHILD
// account this test creates is NOT covered by that mechanism, so this spec
// cleans it up itself in afterAll (see helpers/deleteCreatedChild.js).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import { deleteCreatedChildrenByNamePrefix } from '../../helpers/deleteCreatedChild.js';

const ACCOUNT = accountFor('teacher-g');

// Unique per test run so re-running this spec locally never collides with a
// child left over from a previous (possibly interrupted) run, and so the
// cleanup query can never accidentally match a real/other test's data.
const CHILD_NAME_PREFIX = 'E2E SwitchProfile Child';
const childName = `${CHILD_NAME_PREFIX} ${Date.now()}`;

test.describe('Switch Profile — teacher adds a parent profile and switches between them', () => {
  test.use({ storageState: statePath('teacher-g') });

  test.afterAll(async () => {
    const deleted = await deleteCreatedChildrenByNamePrefix(ACCOUNT.email, CHILD_NAME_PREFIX);
    // Not a hard assertion — if the test failed before creating the child,
    // there's legitimately nothing to clean up. Logged so a 0 here after a
    // PASSING test run would be visible as suspicious in CI output.
    console.log(`[switch-profile cleanup] deleted ${deleted} child account(s) for ${ACCOUNT.email}`);
  });

  test('teacher adds a parent profile via onboarding, reaches the Parent Dashboard, and switches back to Teacher', async ({ page, context }) => {
    await applySession(context, 'teacher-g');
    await page.goto('/');
    // Same real-app-loaded marker harvestSession() itself waits for (the
    // sidebar's top-level "Aivorah" logo, outside the landing page's
    // iframe) — a generous timeout here absorbs a first-hit dev-server
    // recompile after a source change, which a short default timeout can
    // otherwise mistake for a real session/login failure.
    await page.getByText('Aivorah', { exact: true }).first().waitFor({ timeout: 30000 });
    await dismissAnnouncementIfPresent(page);

    // ── 1. Single-role teacher sees the real "Also a parent?" hint ──────
    // This alone is a meaningful assertion: it proves the isDualRole gate
    // correctly shows the hint for a genuinely single-role account (not
    // just implied by the rest of the flow working).
    //
    // SwitchProfile.tsx is shared by BOTH Sidebar.tsx (the always-visible
    // web nav) and DrawerContent.tsx (react-navigation's Drawer, which keeps
    // its content mounted off-screen for slide animations even when closed).
    // Both render at once, so SwitchProfile takes a testIDPrefix prop —
    // Sidebar.tsx defaults to 'sidebar', DrawerContent.tsx passes 'drawer' —
    // so the two copies never share a testID (an earlier attempt to
    // disambiguate with a CSS :visible selector instead was unreliable: the
    // off-screen drawer copy still intercepted pointer events on click).
    const addParentHint = page.getByTestId('sidebar-add-parent-hint');
    await expect(addParentHint).toBeVisible();
    // The Switch Profile pills must NOT exist yet — only one role so far.
    await expect(page.getByTestId('sidebar-role-pill-teacher')).toHaveCount(0);
    await expect(page.getByTestId('sidebar-role-pill-parent')).toHaveCount(0);

    await addParentHint.click();

    // ── 2. Real parent onboarding form ──────────────────────────────────
    await expect(page.getByText('Parent Onboarding')).toBeVisible();

    // Personal Info — required fields (see parentCompletion.ts: fullName,
    // city, dob, mobile all non-empty).
    await page.getByPlaceholder('Your name').fill('E2E Switch Profile Teacher');
    // Country defaults to India; State -> City cascades, same pattern as
    // tests/student/onboarding.spec.js's fillStateAndCity().
    await page.getByText('Select your state').click();
    await page.getByPlaceholder('Search state...').fill('Telangana');
    await page.getByText('Telangana', { exact: true }).click();
    await page.getByText('Select your city').click();
    await page.getByText('Hyderabad', { exact: true }).click();
    // DOB — same shared DatePickerInput component as fillDateOfBirth() in
    // tests/student/onboarding.spec.js, but that helper's two-click year
    // shortcut ('2011' then '2005') only works because 2005 happens to fall
    // in the picker's default 12-year window. DatePickerInput opens showing
    // (today's year - 15) as the year label — clicking it enters year-grid
    // mode starting at that decade. Our target year (1985) is further back,
    // so we page the year grid back with '‹' until 1985 is visible.
    await page.getByText('DD / MM / YYYY').click();
    await page.getByText(String(new Date().getFullYear() - 15), { exact: true }).click();
    const prevYearRange = page.getByText('‹');
    await prevYearRange.click();
    await prevYearRange.click();
    await page.getByText('1985', { exact: true }).click();
    await page.getByText('Jun', { exact: true }).click();
    await page.getByText('15', { exact: true }).click();
    // Mobile — must be >=10 real digits for +91 (handleFinish's own
    // validation, stricter than the completion-gate's "non-empty" check).
    await page.getByPlaceholder('98765 43210').fill('9876543210');

    // Your Children — a child UNDER 14 (auto-create path, no OTP).
    await page.getByPlaceholder("Enter your child's name").fill(childName);
    await page.getByPlaceholder('e.g. 9').fill('9');
    await page.getByPlaceholder('e.g. Hyderabad International School').fill('E2E Test School');
    await page.getByPlaceholder("Search for the school's city").fill('Hyderabad');
    await page.getByText('Hyderabad', { exact: true }).last().click();

    // Child's Learning Profile — curriculum + grade (curriculumDone).
    await page.getByText('CBSE', { exact: true }).click();
    await page.getByText('Grade 4', { exact: true }).click();

    // Child's Account — leave email + password blank (auto-generated
    // login), which satisfies isChildAccountDone() for age<14. Do NOT fill
    // this field: any non-blank value (even an @aivorah.student address)
    // requires OTP verification per OnboardingParentBoxes.tsx's own
    // childEmailVerified gate (isSystemGeneratedStudentEmail only bypasses
    // verification in the LOGIN flow, not this form) — this suite has no
    // OTP-reading mechanism. NOTE: the server derives the auto-generated
    // login deterministically from the PARENT's email
    // (`${parentLocalPart}_ch1@aivorah.student`, see
    // ai-mentor/server/routes/parent.js's generateChildLoginId), so if a
    // stale/orphaned Firebase user already exists at that exact address
    // (e.g. from old manual testing), every run will collide with
    // "auth/email-already-in-use" until that orphan is deleted in the
    // Firebase console — this suite has no Firebase Admin credentials to
    // do that itself.

    // ── 3. Complete Setup ────────────────────────────────────────────────
    const completeBtn = page.getByText('Complete Setup', { exact: true });
    await expect(completeBtn).toBeEnabled();
    await completeBtn.click();

    // A brand-new child account triggers the credentials modal — acknowledge it.
    const gotItBtn = page.getByText("Got it, I've saved these", { exact: true });
    if (await gotItBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await gotItBtn.click();
    }

    // ── 4. Real Parent Dashboard ─────────────────────────────────────────
    await expect(page.getByText(/Welcome, /)).toBeVisible({ timeout: 15000 });

    // ── 5. Switch Profile is now real (dual-role) ────────────────────────
    const teacherPill = page.getByTestId('sidebar-role-pill-teacher');
    const parentPill = page.getByTestId('sidebar-role-pill-parent');
    await expect(teacherPill).toBeVisible();
    await expect(parentPill).toBeVisible();

    await teacherPill.click();
    await expect(page.getByText(/Good (morning|afternoon|evening),/)).toBeVisible({ timeout: 15000 });

    // Bidirectional — switching back to Parent still works, not a one-way trip.
    await page.getByTestId('sidebar-role-pill-parent').click();
    await expect(page.getByText(/Welcome, /)).toBeVisible({ timeout: 15000 });
  });
});
