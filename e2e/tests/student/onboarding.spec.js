// This file tests the STUDENT ONBOARDING flow: the setup screens a student
// fills in AFTER logging in for the first time (name, gender, date of birth,
// curriculum, school, location, grade, learning style, interests) before they
// can reach the Dashboard.
//
// Test accounts used: student-d1 through student-d9, ONE PER TEST (see
// tests/helpers/accounts.js - this spec owns them because each writes the
// onboarding_completed flag). Session comes from global-setup.js, same as
// every other spec - see CLAUDE.md's "Login: reuse the session, don't
// re-login" rule; this file is not the login spec, so it must not drive the
// login form itself.
//
// Why 9 accounts and not 1: all 9 tests run in PARALLEL, and every one of
// them resets onboarding_completed then fills/submits the form. With a single
// shared account, one test's reset or completed-onboarding state would stomp
// on another mid-run - a test could still be filling the form when a parallel
// test's beforeEach reset the flag underneath it, so the page changed out
// from under it and selectors like "Your name" stopped matching. Giving each
// test its own account removes the collision entirely.
//
// BEFORE EACH TEST BELOW, we reset that test's account's onboarding_completed
// flag back to false directly in the database (see
// tests/helpers/resetOnboarding.js) - this guarantees every test starts from
// the exact same "onboarding not done yet" state, instead of depending on
// what a previous test run left behind. Resetting the flag doesn't touch the
// login session, so the two stay independent of each other.
//
// We test:
// 1. Happy path -> fill every required field -> land on the Dashboard
// 2. Each required field left empty, one at a time -> should NOT reach
//    the Dashboard (Complete Setup stays blocked)
// 3. A known bug: the form lets you pick a Grade and a Date of Birth that
//    don't match (e.g. Grade 3 with a DOB that makes the student 15) -
//    it should warn/block this but currently doesn't. We keep this test
//    even though it fails, to document the gap until it's fixed.
//
// NOTE: "Use my location" is not tested here - see git history/PR for why.

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { resetOnboarding } from '../helpers/resetOnboarding.js';
import { accountFor } from '../helpers/accounts.js';
import { newPageAs } from '../helpers/session.js';

// Direct-DB read, same pattern/creds as resetOnboarding.js — used only to
// verify what actually landed in the database after a UI save, since
// gender/dob/state aren't displayed anywhere in the student-facing app
// outside this onboarding form itself.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function getUserRow(email) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('dob, gender, state')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`Failed to read users row for ${email}: ${error.message}`);
  return data;
}

// One dedicated account per test - see the note above on why.
const ACCOUNTS = {
  happyPath: 'student-d1',
  name: 'student-d2',
  gender: 'student-d3',
  dob: 'student-d4',
  curriculum: 'student-d5',
  school: 'student-d6',
  location: 'student-d7',
  grade: 'student-d8',
  gradeDobMismatch: 'student-d9',
  persistenceCheck: 'student-d10',
};

// Helper: opens a browser tab already logged in as the given onboarding
// account (session harvested once in global-setup.js) and lands on '/'.
async function openAsOnboardingStudent(browser, accountKey) {
  const page = await newPageAs(browser, accountKey);
  await page.goto('/');
  return page;
}

// Each of these fills in ONE section of the onboarding form. Splitting them
// up (instead of one big function) lets each test skip exactly one step,
// to check that missing field actually blocks Complete Setup.
async function fillName(page) {
  await page.getByRole('textbox', { name: 'Your name' }).fill('Saimohan');
}

async function fillGender(page) {
  await page.getByText('Male', { exact: true }).click();
}

// Opens a calendar dialog with 3 pickers in order: click the year in the
// header to open a year list -> picking a year opens a month list ->
// picking a month opens the day grid we click into.
async function fillDateOfBirth(page) {
  await page.getByText('DD / MM / YYYY').click();
  await page.getByText('2011', { exact: true }).click();
  await page.getByText('2005', { exact: true }).click();
  await page.getByText('Feb', { exact: true }).click();
  await page.getByText('2', { exact: true }).click();
}

async function fillCurriculum(page) {
  await page.getByText('IB PYP', { exact: true }).click();
}

async function fillSchoolName(page) {
  const schoolInput = page.getByRole('textbox', { name: 'Type your school name (e.g.' });
  await schoolInput.click();
  await schoolInput.fill('The Shri Ram Academy');
}

// City only becomes pickable once a state is chosen, so this fills both.
async function fillStateAndCity(page) {
  await page.getByText('Select your state').click();
  await page.getByPlaceholder('Search state...').fill('Telangana');
  await page.getByText('Telangana', { exact: true }).click();
  await page.getByText('Select your city').click();
  await page.getByText('Hyderabad', { exact: true }).click();
}

async function fillGrade(page) {
  await page.getByText('Grade 3').click();
}

async function fillLearningStyle(page) {
  await page.getByText('Casual').click();
}

async function fillInterests(page) {
  await page.getByText('Reading', { exact: true }).click();
}

// Fills every step of the onboarding form and clicks Complete Setup.
// Pass a field name in `skip` to leave that one step out (used by the
// empty-field tests below).
async function completeOnboardingForm(page, { skip } = {}) {
  if (skip !== 'name') await fillName(page);
  if (skip !== 'gender') await fillGender(page);
  if (skip !== 'dob') await fillDateOfBirth(page);
  if (skip !== 'curriculum') await fillCurriculum(page);
  if (skip !== 'school') await fillSchoolName(page);
  if (skip !== 'location') await fillStateAndCity(page);
  if (skip !== 'grade') await fillGrade(page);
  if (skip !== 'learningStyle') await fillLearningStyle(page);
  if (skip !== 'interests') await fillInterests(page);

  // This form is a single page (not a step wizard) - "Complete Setup" is
  // the one button at the bottom that submits everything at once.
  await page.getByText('Complete Setup').click();
}

test.describe('Student Onboarding', () => {
  // Each test resets its OWN account's onboarding status in the database
  // before it runs, so it starts fresh no matter what an earlier run left
  // behind. This can't be a shared beforeEach anymore, since which account
  // to reset depends on which test is about to run.
  async function resetFor(accountKey) {
    await resetOnboarding(accountFor(accountKey).email);
  }

  // TEST 1: filling every step correctly should land the student on the Dashboard
  test('completing onboarding reaches the dashboard', async ({ browser }) => {
    await resetFor(ACCOUNTS.happyPath);
    const page = await openAsOnboardingStudent(browser, ACCOUNTS.happyPath);
    await completeOnboardingForm(page);

    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 10000,
    });
  });

  // TESTS 2a-2h: leaving ONE required field empty should NOT let the
  // student reach the Dashboard - Complete Setup should stay blocked.
  const requiredFields = ['name', 'gender', 'dob', 'curriculum', 'school', 'location', 'grade'];

  for (const field of requiredFields) {
    test(`leaving ${field} empty blocks onboarding`, async ({ browser }) => {
      const accountKey = ACCOUNTS[field];
      await resetFor(accountKey);
      const page = await openAsOnboardingStudent(browser, accountKey);
      await completeOnboardingForm(page, { skip: field });

      // Should NOT reach the Dashboard - still stuck on the onboarding page.
      await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).not.toBeVisible({
        timeout: 5000,
      });
    });
  }

  // TEST 3 (KNOWN BUG): the app should not let you pick a Grade and Date of
  // Birth that don't realistically match (e.g. Grade 3 with a DOB that
  // makes the student 15 years old), but today it lets you through anyway.
  // This test is written for the CORRECT/expected behavior, so it will show
  // up RED/failing in results until the app actually adds this validation -
  // that's intentional, it's how we track the bug is still unfixed.
  test('grade and date of birth mismatch should be blocked (known bug - not implemented yet)', async ({
    browser,
  }) => {
    await resetFor(ACCOUNTS.gradeDobMismatch);
    const page = await openAsOnboardingStudent(browser, ACCOUNTS.gradeDobMismatch);
    await completeOnboardingForm(page); // DOB = 2 Feb 2005, Grade = Grade 3 (mismatched on purpose)

    await expect(
      page.getByText(/does not match|doesn't match|check the date of birth/i),
    ).toBeVisible({ timeout: 5000 });
  });

  // Regression test for the "Gender/DOB/State missing on re-login" bug
  // (2026-08-26): these 3 fields used to only ever be saved to
  // user_preferences via an un-awaited, best-effort PATCH — and separately,
  // were only ever READ BACK via a separate GET /user/preferences call
  // wrapped in a silent try/catch. Either one failing (or just being slow)
  // silently dropped them on the student's next login, while everything
  // else (name/school/curriculum/grade) never had this problem. Root-cause
  // fix: dob/gender/state are now real `users` columns, written and read
  // the same reliable way grade/curriculum always were.
  //
  // Repro, matching exactly how the bug was found: log in -> fill Gender/
  // DOB/State -> Save (without finishing onboarding) -> leave -> come back
  // (a fresh page load, same session) -> the values must still be there.
  test('Gender/DOB/State survive Save & Exit -> leave -> return, both in the DB and pre-filled in the form', async ({ browser }) => {
    await resetFor(ACCOUNTS.persistenceCheck);
    const email = accountFor(ACCOUNTS.persistenceCheck).email;
    const page = await openAsOnboardingStudent(browser, ACCOUNTS.persistenceCheck);

    // Fill ONLY Gender/DOB/State — deliberately not the other required
    // fields, so "Save & Exit" (not "Complete Setup") is what persists them.
    await fillGender(page); // Male
    await fillDateOfBirth(page); // 2 Feb 2005
    await fillStateAndCity(page); // Telangana / Hyderabad

    // Leave onboarding via the real "Save & Exit" confirm flow.
    await page.getByLabel('Back to home page').click();
    await page.getByText('Save & go to home page').click();

    // Give the save request a moment to actually land before we check the DB.
    await page.waitForTimeout(1500);

    // 1) Verify what's actually IN THE DATABASE — gender/dob/state aren't
    //    displayed anywhere else in the student app, so this is the only
    //    reliable way to confirm the save truly persisted (not just an
    //    optimistic local UI update that never reached the server).
    const savedRow = await getUserRow(email);
    expect(savedRow.gender).toBe('Male');
    expect(savedRow.dob).toBe('02/02/2005');
    expect(savedRow.state).toBe('Telangana');

    // 2) Return — a fresh page load on the same logged-in session, exactly
    //    like closing the tab and coming back, or logging in again elsewhere.
    //    Onboarding isn't complete yet, so this must land back on this same
    //    form, now pre-filled from the (now-fixed) reliable read path.
    await page.goto('/');

    await expect(page.getByText('02/02/2005', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Telangana', { exact: true })).toBeVisible();
    // Gender has no visible "selected" text of its own (just a chip style
    // change) — the DB check above is the authoritative assertion for it;
    // this just confirms the form actually reloaded to the same screen.
    await expect(page.getByText('Male', { exact: true })).toBeVisible();
  });
});
