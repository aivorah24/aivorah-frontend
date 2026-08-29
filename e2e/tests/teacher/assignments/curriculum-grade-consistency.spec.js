// Teacher Assignments — curriculum/grade consistency with the teacher's own
// onboarding configuration (Staff Subject Mapping / teaches[]).
//
// Background (see the architecture investigation report from this session):
// TeacherAssignmentsScreen.tsx derives its Grade/Curriculum defaults from
// `user?.teaches?.[0]` with NO "has subjects" filter, while onboarding's own
// completion logic (computeTeacherCompletion) picks the primary entry using a
// DIFFERENT filter (first entry that has subjects filled in). These two
// "primary entry" algorithms can disagree. Also: `baseGradeOptions` prefers
// `teacherGrades` over the curriculum-derived list with no filtering by the
// currently-selected curriculum, so grade options don't narrow down when you
// switch curriculum. Neither bug has been fixed yet - these tests document
// ACTUAL behavior; do not "fix" a test to hide a real product bug found here.
//
// Only 4 dedicated accounts exist (teacher-e/f/g/h) for 7 test cases, so each
// account is shared by 1-2 tests that mutate the SAME teaches[]/curriculum
// field. Sharing an account across PARALLEL tests would race their
// withTeaches() snapshot/restore (see accounts.js's mutable-account rule) -
// so each account's tests are grouped into their own test.describe.serial
// block below. Every block still runs fully in parallel WITH every other
// block (and with every other spec file in the suite) - only tests that
// share one account are serialized relative to each other.

import { test, expect } from '@playwright/test';
import { newPageAs } from '../../helpers/session.js';
import { accountFor } from '../../helpers/accounts.js';
import { snapshotTeaches, restoreTeaches, setTeacherTeaches } from '../../helpers/teacherTeaches.js';

async function withTeaches(accountKey, config, run) {
  const email = accountFor(accountKey).email;
  const snapshot = await snapshotTeaches(email);
  try {
    await setTeacherTeaches(email, config);
    await run();
  } finally {
    await restoreTeaches(email, snapshot);
  }
}

test.describe.serial('teacher-e: CBSE/Grade 2 pre-fill + grade-options-not-filtered bug', () => {
  test('CBSE/Grade 2 teacher: Assignments screen pre-fills the real configured grade/curriculum, not a hardcoded IB PYP/Grade 3 default', async ({ browser }) => {
    await withTeaches(
      'teacher-e',
      { curriculum: 'CBSE', teaches: [{ curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] }] },
      async () => {
        const page = await newPageAs(browser, 'teacher-e');
        await page.goto('/teacher/assignments');
        await page.getByText('New', { exact: true }).click();
        await page.getByText(/^Generate.*Assignment$/).first().click();

        // Real config is CBSE/Grade 2 - the form must reflect it, not the
        // IB PYP/Grade 3 defaults hardcoded at mount (lines 541-544).
        await expect(page.getByText('Grade 2', { exact: true })).toBeVisible();
        await expect(page.getByText('CBSE', { exact: true })).toBeVisible();
        // The "(3-5)" IB-only restriction label must NOT appear for a
        // non-IB-PYP teacher.
        await expect(page.getByText(/IB PYP \(3.?5\)/)).not.toBeVisible();
      }
    );
  });

  test('grade options do not narrow down when switching curriculum (baseGradeOptions bug reproduction)', async ({ browser }) => {
    // A teacher configured to teach BOTH CBSE (wide grade range) and IB PYP
    // (3-5 only). Per lines 685-728, baseGradeOptions prefers the raw
    // teacherGrades list over a curriculum-filtered list - so switching the
    // Curriculum chip to IB PYP should (per the bug) still offer grades
    // outside 3-5, instead of narrowing to just Grade 3/4/5.
    await withTeaches(
      'teacher-e',
      {
        curriculum: 'CBSE',
        teaches: [
          { curriculum: 'CBSE', grade: 'Grade 7', subjects: ['Mathematics'] },
          { curriculum: 'IB PYP', grade: 'Grade 4', subjects: ['English'] },
        ],
      },
      async () => {
        const page = await newPageAs(browser, 'teacher-e');
        await page.goto('/teacher/assignments');
        await page.getByText('New', { exact: true }).click();
        await page.getByText(/^Generate.*Assignment$/).first().click();

        // Switch curriculum chip to IB PYP.
        await page.getByText('IB PYP', { exact: true }).first().click();

        // Documented bug: Grade 7 (outside IB PYP's 3-5 range) is still
        // offered as a chip option after switching to IB PYP, because grade
        // options aren't filtered by the currently-selected curriculum.
        await expect(page.getByText('Grade 7', { exact: true })).toBeVisible();
      }
    );
  });
});

test.describe.serial('teacher-f: IB PYP/Grade 4 pre-fill + network payload verification', () => {
  test('IB PYP/Grade 4 teacher: Assignments screen pre-fills IB PYP/Grade 4 and grade options are restricted to 3-5', async ({ browser }) => {
    await withTeaches(
      'teacher-f',
      { curriculum: 'IB PYP', teaches: [{ curriculum: 'IB PYP', grade: 'Grade 4', subjects: ['English'] }] },
      async () => {
        const page = await newPageAs(browser, 'teacher-f');
        await page.goto('/teacher/assignments');
        await page.getByText('New', { exact: true }).click();
        await page.getByText(/^Generate.*Assignment$/).first().click();

        await expect(page.getByText('Grade 4', { exact: true })).toBeVisible();
        await expect(page.getByText('IB PYP', { exact: true }).first()).toBeVisible();
      }
    );
  });

  test('the network request sent on Generate reflects the UI-selected grade/curriculum, not the initial defaults', async ({ browser }) => {
    await withTeaches(
      'teacher-f',
      // IB PYP here (not CBSE) deliberately: the visible button always calls
      // /assignments/generate-ibpyp regardless of curriculum (see the BUG
      // test below) - using an actual IB PYP teacher means this test checks
      // grade/curriculum fidelity in the request body without ALSO tripping
      // over that separate endpoint-routing bug.
      { curriculum: 'IB PYP', teaches: [{ curriculum: 'IB PYP', grade: 'Grade 5', subjects: ['Mathematics'] }] },
      async () => {
        const page = await newPageAs(browser, 'teacher-f');
        await page.goto('/teacher/assignments');
        await page.getByText('New', { exact: true }).click();
        await page.getByText(/^Generate.*Assignment$/).first().click();

        await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(`E2E Consistency Check ${Date.now()}`);
        await page.getByText('Mathematics', { exact: true }).click();
        await expect(page.getByText('Grade 5', { exact: true })).toBeVisible();

        // The visible button's real label is "Generate {curriculum} Assignment"
        // (or "Generate Full IB PYP Assignment" for IB PYP) - see lines 3998-4041
        // of TeacherAssignmentsScreen.tsx.
        const [request] = await Promise.all([
          page.waitForRequest((req) => /\/assignments\/generate-(steps|ibpyp)/.test(req.url())),
          // .last(): the heading text above the button ("Generate CBSE
          // Assignment" / "Generate IB PYP Assignment") is a substring match
          // for the same regex, so the button (which renders after it in the
          // DOM) is always the last match.
          page.getByText(/^Generate .*Assignment$/).last().click(),
        ]);
        const body = request.postDataJSON();
        expect(body.grade).toBe('Grade 5');
        expect(body.curriculum).toBe('IB PYP');
      }
    );
  });
});

test.describe.serial('teacher-g: empty teaches[] fallback + generate-endpoint routing bug', () => {
  test('teacher with an empty teaches[] (no completed onboarding entries): documents the actual fallback grade/curriculum shown', async ({ browser }) => {
    await withTeaches('teacher-g', { curriculum: null, teaches: [] }, async () => {
      const page = await newPageAs(browser, 'teacher-g');
      await page.goto('/teacher/assignments');
      await page.getByText('New', { exact: true }).click();
      await page.getByText(/^Generate.*Assignment$/).first().click();

      // Actual current behavior per lines 541-544: with no teaches[0] and no
      // top-level curriculum, grade falls back to the hardcoded 'Grade 3' and
      // curriculum falls back to '' (empty). This assertion documents that
      // real fallback rather than assuming what "should" happen - if this
      // ever changes, it's a deliberate product decision, not a test bug.
      await expect(page.getByText('Grade 3', { exact: true })).toBeVisible();
    });
  });

  test('BUG: a CBSE teacher\'s "Generate CBSE Assignment" button sends the request to the IB-PYP-only generation endpoint', async ({ browser }) => {
    // Root cause (confirmed by reading TeacherAssignmentsScreen.tsx): the ONLY
    // button wired to onPress for the assignment-generation card is
    // generateIBAssignment (line 4029), which unconditionally fetches
    // `${SERVER_URL}/assignments/generate-ibpyp` (line 1594) - even though its
    // own label reads "Generate CBSE Assignment" for a non-IB teacher. The
    // curriculum-correct generateSteps() function (line 1551, fetches
    // /assignments/generate-steps) is fully defined but has NO onPress caller
    // anywhere in the file - dead code. This test intentionally documents the
    // bug rather than asserting the "should" behavior, so it FAILS until the
    // button is rewired to call generateSteps() for non-IB curricula.
    await withTeaches(
      'teacher-g',
      { curriculum: 'CBSE', teaches: [{ curriculum: 'CBSE', grade: 'Grade 5', subjects: ['Mathematics'] }] },
      async () => {
        const page = await newPageAs(browser, 'teacher-g');
        await page.goto('/teacher/assignments');
        await page.getByText('New', { exact: true }).click();
        await page.getByText(/^Generate.*Assignment$/).first().click();

        await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(`E2E Endpoint Bug Check ${Date.now()}`);
        await page.getByText('Mathematics', { exact: true }).click();

        const [request] = await Promise.all([
          page.waitForRequest((req) => /\/assignments\/generate-(steps|ibpyp)/.test(req.url())),
          // .last(): the heading text above the button ("Generate CBSE
          // Assignment" / "Generate IB PYP Assignment") is a substring match
          // for the same regex, so the button (which renders after it in the
          // DOM) is always the last match.
          page.getByText(/^Generate .*Assignment$/).last().click(),
        ]);

        // A CBSE teacher's request should hit generate-steps, not
        // generate-ibpyp. This assertion is expected to FAIL against the
        // current code - that failure IS the bug report.
        expect(request.url()).toContain('/assignments/generate-steps');
      }
    );
  });
});

test.describe('teacher-h: onboarding vs Assignments "primary entry" disagreement', () => {
  test('teacher whose first teaches[] entry has no subjects: Assignments screen and onboarding disagree on which entry is "primary"', async ({ browser }) => {
    // entry[0] has NO subjects (incomplete) - onboarding's own completion
    // logic (computeTeacherCompletion) would skip this entry and treat
    // entry[1] (CBSE/Grade 6) as primary. TeacherAssignmentsScreen.tsx has
    // no such filter and reads teaches[0] raw - so it should show the
    // INCOMPLETE entry's curriculum/grade (IB PYP/Grade 3) instead, proving
    // the two "primary entry" algorithms disagree.
    await withTeaches(
      'teacher-h',
      {
        curriculum: 'IB PYP',
        teaches: [
          { curriculum: 'IB PYP', grade: 'Grade 3', subjects: [] },
          { curriculum: 'CBSE', grade: 'Grade 6', subjects: ['Science'] },
        ],
      },
      async () => {
        const page = await newPageAs(browser, 'teacher-h');
        await page.goto('/teacher/assignments');
        await page.getByText('New', { exact: true }).click();
        await page.getByText(/^Generate.*Assignment$/).first().click();

        // Assignments screen reads teaches[0] raw (no "has subjects" filter)
        // -> shows the IB PYP/Grade 3 entry, NOT the CBSE/Grade 6 entry that
        // onboarding would consider "primary". This is the confirmed
        // architectural inconsistency from the investigation report.
        await expect(page.getByText('Grade 3', { exact: true })).toBeVisible();
        await expect(page.getByText('IB PYP', { exact: true }).first()).toBeVisible();
      }
    );
  });
});
