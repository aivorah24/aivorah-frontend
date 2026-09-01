// Teacher Assignments -> Generate AI Assignment: does the Subject/Grade chip
// row actually reflect the real curriculum source of truth, or the frontend's
// static, curriculum-unaware SUBJECTS/ALL_GRADES/IB_GRADES lists?
//
// Written from the 2026-08-25 investigation report. Per that report:
//   - TeacherAssignmentsScreen.tsx's Subject chip row is driven by a single
//     static SUBJECTS array (constants.ts) shown for EVERY curriculum/grade.
//   - The real source of truth is GET /curriculum/subjects?curriculum=&grade=,
//     which for NCERT/CBSE is filtered against scripts/ncert-official-
//     subjects.json (verified against ncert.nic.in), and for every other
//     curriculum returns whatever's actually ingested in Qdrant
//     (ai_mentor_content collection).
//
// EXPECTED-VALUE STRATEGY: rather than hand-computing each curriculum's
// filtered subject list here (that exhaustive computation belongs in
// Integration/Unit tests against curriculum.js directly), every test below
// calls the REAL, LIVE GET /curriculum/subjects endpoint as its oracle, then
// asserts the UI's chip row matches that oracle exactly.
//
// Per the investigation report, most of these ARE EXPECTED TO FAIL against
// the current implementation - that is the point. Do NOT weaken these
// assertions to make the suite green; a failure here is a bug report.
//
// ACCOUNT SPLIT (2026-08-25): originally all 16 tests shared one account
// (teacher-j) in a single describe.serial block. That meant one failure
// skipped the other 15 (Playwright serial mode stops the whole block on
// first failure, regardless of worker count - confirmed by testing with
// --workers=1, which showed the identical skip pattern as full parallel).
// Split into 4 accounts x 4 tests each, one describe.serial block per
// account, so a failure only blocks its own small cluster - each block is
// still parallel-safe against every other block/file (different accounts).

import { test, expect } from '@playwright/test';
import { newPageAs } from '../../helpers/session.js';
import { accountFor } from '../../helpers/accounts.js';
import { snapshotTeaches, restoreTeaches, setTeacherTeaches } from '../../helpers/teacherTeaches.js';

async function withCurriculum(accountKey, curriculum, grade, run) {
  const email = accountFor(accountKey).email;
  const snapshot = await snapshotTeaches(email);
  try {
    await setTeacherTeaches(email, { curriculum, teaches: [{ curriculum, grade, subjects: ['Mathematics'] }] });
    await run();
  } finally {
    await restoreTeaches(email, snapshot);
  }
}

// Live oracle: the real subjects for this curriculum+grade, straight from
// the backend endpoint the app itself would call - not a hardcoded list.
async function realSubjectsFor(request, curriculum, grade) {
  const res = await request.get(
    `http://localhost:3007/curriculum/subjects?curriculum=${encodeURIComponent(curriculum)}&grade=${encodeURIComponent(grade)}`,
  );
  expect(res.ok(), `GET /curriculum/subjects?curriculum=${curriculum}&grade=${grade} must succeed`).toBeTruthy();
  const body = await res.json();
  return (body.subjects || []).map((s) => s.subject).sort();
}

async function openGenerateForm(page) {
  await page.goto('/teacher/assignments');
  await page.getByText('New', { exact: true }).click();
  await page.getByText(/^Generate (AI|IB PYP) Assignment$/, { exact: true }).click();
}

// Reads every subject chip actually rendered in the open Generate form.
// The chip row has no testID (it's the plain static SUBJECTS.map from
// constants.ts), so this reads the dialog's chip TouchableOpacitys by its
// known real-vs-static candidate universe (static list ∪ live oracle),
// checking each one's actual visibility - proving an exact-set match.
async function visibleSubjectChips(page, candidatePool) {
  const dialog = page.getByRole('dialog');
  const visible = [];
  for (const subj of candidatePool) {
    const chip = dialog.getByText(subj, { exact: true }).first();
    if (await chip.isVisible().catch(() => false)) visible.push(subj);
  }
  return visible.sort();
}

const STATIC_SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Social Studies', 'Language Acquisition',
  'Visual Arts', 'ICT', 'Physical Education',
];

// ── Cluster A (teacher-j): IB PYP ──────────────────────────────────────────

test.describe('Teacher Assignments — Subject/Grade chips: IB PYP cluster (teacher-j)', () => {

  test('IB PYP Grade 1: subject chips must match the real GET /curriculum/subjects data, not the static list', async ({ browser, request }) => {
    // EXPECTED TO FAIL: real IB_PYP|Grade 1 data (Arts, English, Mathematics,
    // Physical Education, Science, Social Studies) has no Language
    // Acquisition and no ICT at Grade 1 - the static SUBJECTS list shows
    // both anyway, and Grade 1 isn't even reachable in the UI's own
    // IB_GRADES chip row (see the grade-options test below), so this
    // documents the subject-level half of the same underlying defect.
    const real = await realSubjectsFor(request, 'IB PYP', 'Grade 1');
    expect(real.length, 'sanity: real data must not be empty').toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-j');
    await withCurriculum('teacher-j', 'IB PYP', 'Grade 1', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for IB PYP Grade 1 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('IB PYP Grade 4: subject chips must match the real GET /curriculum/subjects data', async ({ browser, request }) => {
    // EXPECTED TO FAIL: real IB_PYP|Grade 4 data includes "Economics & Trade"
    // (not in the static list at all) and ICT (present in real data from
    // Grade 3+, but the static list shows it for every grade regardless -
    // right answer, wrong reason). Real data has no "Language Acquisition"
    // at any IB PYP grade - only IB MYP's real data does.
    const real = await realSubjectsFor(request, 'IB PYP', 'Grade 4');
    expect(real.length).toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-p');
    await withCurriculum('teacher-p', 'IB PYP', 'Grade 4', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for IB PYP Grade 4 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('BUG: IB PYP grade chip row excludes Grade 1 and 2, and labels itself "(3-5)" despite real content existing at 1-2', async ({ browser, request }) => {
    // EXPECTED TO FAIL. Real IB_PYP data (confirmed via direct Qdrant survey,
    // 2026-08-25) spans Grade 1 through 5 - Grade 1 and 2 both have real,
    // ingested subject content. The frontend's IB_GRADES constant is
    // hardcoded to ['Grade 3','Grade 4','Grade 5'] and the UI explicitly
    // labels the Grade field "· IB PYP (3-5)" - presenting an arbitrary UI
    // restriction as if it were a real curriculum fact.
    const real1 = await realSubjectsFor(request, 'IB PYP', 'Grade 1');
    const real2 = await realSubjectsFor(request, 'IB PYP', 'Grade 2');
    expect(real1.length, 'real IB PYP Grade 1 content must exist').toBeGreaterThan(0);
    expect(real2.length, 'real IB PYP Grade 2 content must exist').toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-q');
    await withCurriculum('teacher-q', 'IB PYP', 'Grade 4', async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');

      await expect(dialog.getByText('Grade 1', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Grade 2', { exact: true })).toBeVisible();
      await expect(page.getByText(/IB PYP \(3.?5\)/)).not.toBeVisible();
    });
  });

  test('Generation for a valid combination (IB PYP Grade 4, Mathematics, "Area and Perimeter") produces content actually about that topic', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-r');
    await withCurriculum('teacher-r', 'IB PYP', 'Grade 4', async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      const title = `E2E Relevance Check ${Date.now()}`;
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(title);
      await dialog.getByText('Mathematics', { exact: true }).click();
      await dialog.getByText('Grade 4', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill('Area and Perimeter');

      const [genRequest] = await Promise.all([
        page.waitForRequest((req) => /\/assignments\/generate-(steps|ibpyp)/.test(req.url()), { timeout: 60000 }),
        page.getByText(/^Generate .*Assignment$/).last().click(),
      ]);
      const body = genRequest.postDataJSON();
      expect(body.grade).toBe('Grade 4');
      expect(body.curriculum).toBe('IB PYP');
      expect(body.topic).toContain('Area and Perimeter');

      await expect(page.getByText(/area|perimeter/i).first()).toBeVisible({ timeout: 45000 });
    });
  });
});

// ── Cluster B (teacher-m): CBSE / NCERT ────────────────────────────────────

test.describe('Teacher Assignments — Subject/Grade chips: CBSE cluster (teacher-m)', () => {

  test('CBSE Grade 2: subject chips must match the real, ncert.nic.in-verified data', async ({ browser, request }) => {
    // EXPECTED TO FAIL. Real data = [English, Hindi, Mathematics, Urdu]. The
    // static list shows Science, Social Studies, Language Acquisition,
    // Visual Arts, ICT, Physical Education instead - none of which exist for
    // CBSE Grade 2 - and omits Hindi/Urdu entirely.
    const real = await realSubjectsFor(request, 'CBSE', 'Grade 2');
    expect(real).toEqual(['English', 'Hindi', 'Mathematics', 'Urdu']);

    const page = await newPageAs(browser, 'teacher-m');
    await withCurriculum('teacher-m', 'CBSE', 'Grade 2', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for CBSE Grade 2 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('CBSE Grade 6: subject chips must match the real, ncert.nic.in-verified data', async ({ browser, request }) => {
    const real = await realSubjectsFor(request, 'CBSE', 'Grade 6');
    expect(real.length).toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-s');
    await withCurriculum('teacher-s', 'CBSE', 'Grade 6', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for CBSE Grade 6 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('BUG: CBSE grade chip row excludes Grade 1, 2, 10, 11 and 12 despite real NCERT content existing for all of them', async ({ browser, request }) => {
    const real11 = await realSubjectsFor(request, 'CBSE', 'Grade 11');
    expect(real11.length, 'real CBSE Grade 11 content must exist').toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-t');
    await withCurriculum('teacher-t', 'CBSE', 'Grade 6', async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Grade 1', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Grade 2', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Grade 10', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Grade 11', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Grade 12', { exact: true })).toBeVisible();
    });
  });

  test('CBSE Grade 11: subject chips must match the real, ncert.nic.in-verified senior-secondary subject list', async ({ browser, request }) => {
    // Real Grade 11 content spans ~20 stream subjects - the static 8-item
    // list covers essentially none of it, and even wrongly offers "Science"
    // and "Physical Education" as bare labels that don't exist officially
    // at this grade (Grade 11 splits Science into named subjects, and PE is
    // officially "Health and Physical Education").
    const real = await realSubjectsFor(request, 'CBSE', 'Grade 11');
    expect(real.length, 'real CBSE Grade 11 content must exist').toBeGreaterThan(5);
    expect(real).not.toContain('Science');
    expect(real).not.toContain('Physical Education');

    const page = await newPageAs(browser, 'teacher-u');
    await withCurriculum('teacher-u', 'CBSE', 'Grade 11', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for CBSE Grade 11 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });
});

// ── Cluster C (teacher-n): IB MYP / IB DP / Cambridge ──────────────────────

test.describe('Teacher Assignments — Subject/Grade chips: IB MYP/DP + Cambridge cluster (teacher-n)', () => {

  test('IB MYP Grade 7: subject chips must match the real ingested MYP subject groups', async ({ browser, request }) => {
    // Per the investigation report, IB MYP isn't in normalizeCurriculum's
    // alias table at all - it passes through unchanged and happens to match
    // the real Qdrant tag exactly, so this MAY pass today by coincidence.
    const real = await realSubjectsFor(request, 'IB MYP', 'Grade 7');
    expect(real.length, 'real IB MYP Grade 7 content must exist').toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-n');
    await withCurriculum('teacher-n', 'IB MYP', 'Grade 7', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for IB MYP Grade 7 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('IB DP Grade 11: subject chips must match the real ingested DP subjects', async ({ browser, request }) => {
    const real = await realSubjectsFor(request, 'IB DP', 'Grade 11');
    expect(real.length, 'real IB DP Grade 11 content must exist').toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-v');
    await withCurriculum('teacher-v', 'IB DP', 'Grade 11', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for IB DP Grade 11 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('Cambridge Grade 6: subject chips must match the real ingested data (no Social Studies from Grade 6 on)', async ({ browser, request }) => {
    // EXPECTED TO FAIL. Real Cambridge|Grade 6 data = [English, Mathematics,
    // Science] - Social Studies genuinely drops out of the real data from
    // Grade 6 onward (present at Grades 1-5, absent 6+).
    const real = await realSubjectsFor(request, 'Cambridge', 'Grade 6');
    expect(real).toEqual(['English', 'Mathematics', 'Science']);

    const page = await newPageAs(browser, 'teacher-w');
    await withCurriculum('teacher-w', 'Cambridge', 'Grade 6', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for Cambridge Grade 6 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('Cambridge Grade 11: subject chips must match the real ingested data (senior-secondary science stream)', async ({ browser, request }) => {
    const real = await realSubjectsFor(request, 'Cambridge', 'Grade 11');
    expect(real.length, 'real Cambridge Grade 11 content must exist').toBeGreaterThan(0);

    const page = await newPageAs(browser, 'teacher-x');
    await withCurriculum('teacher-x', 'Cambridge', 'Grade 11', async () => {
      await openGenerateForm(page);
      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = await visibleSubjectChips(page, candidatePool);
      expect(shown, `UI subject chips for Cambridge Grade 11 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });
});

// ── Cluster D (teacher-o): ICSE format bug, generation checks, ungrounded
//    bug, Hindi ───────────────────────────────────────────────────────────

test.describe('Teacher Assignments — ICSE format bug + generation checks (teacher-o)', () => {

  test('BUG: ICSE curriculum data is keyed by "Class I/II/X" (roman numerals), but the UI only ever queries "Grade N" - ICSE content is unreachable through this screen', async ({ request }) => {
    // Real ICSE data is keyed "Class I"/"Class II"/"Class X" - not "Grade N"
    // the way every other curriculum in this app is keyed, and
    // TeacherAssignmentsScreen.tsx has no ICSE-specific grade-format branch.
    // No page/account needed - this is a pure API-contract comparison.
    const viaGradeFormat = await realSubjectsFor(request, 'ICSE', 'Grade 1');
    const viaClassFormat = await realSubjectsFor(request, 'ICSE', 'Class I');

    expect(
      viaClassFormat.length,
      'real ICSE content DOES exist, under the "Class I" key - confirms the data is real, not simply uningested',
    ).toBeGreaterThan(0);
    expect(
      viaGradeFormat,
      'querying with the UI\'s own "Grade 1" format must return the SAME real ICSE subjects as "Class I" for the screen to work at all - it does not',
    ).toEqual(viaClassFormat);
  });

  test('Generation for a valid combination (CBSE Grade 6, Mathematics) produces content actually about the given topic', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-o');
    await withCurriculum('teacher-o', 'CBSE', 'Grade 6', async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      const title = `E2E CBSE Relevance ${Date.now()}`;
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(title);
      await dialog.getByText('Mathematics', { exact: true }).click();
      await dialog.getByText('Grade 6', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill('Fractions');

      const [genRequest] = await Promise.all([
        page.waitForRequest((req) => /\/assignments\/generate-(steps|ibpyp)/.test(req.url()), { timeout: 60000 }),
        page.getByText(/^Generate .*Assignment$/).last().click(),
      ]);
      const body = genRequest.postDataJSON();
      expect(body.curriculum).toBe('CBSE');
      expect(body.grade).toBe('Grade 6');

      await expect(page.getByText(/fraction/i).first()).toBeVisible({ timeout: 45000 });
    });
  });

  test('BUG: generating for CBSE Grade 2 + "Science" (a subject that does not exist for that grade) silently produces ungrounded content instead of failing', async ({ browser, request }) => {
    // "Science" is currently selectable for CBSE Grade 2 (it's in the static
    // list) despite not existing in the real curriculum data. Per
    // routes/assignments.js's own comment, 0 grounding chunks previously
    // meant "the old always-default-NCERT collection -> 0 hits -> generic
    // content bug." EXPECTED TO FAIL AS A BUG unless the server has since
    // added a 0-chunk guard for this case.
    const real = await realSubjectsFor(request, 'CBSE', 'Grade 2');
    expect(real).not.toContain('Science');

    const page = await newPageAs(browser, 'teacher-y');
    await withCurriculum('teacher-y', 'CBSE', 'Grade 2', async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      const title = `E2E Ungrounded Check ${Date.now()}`;
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(title);
      await dialog.getByText('Science', { exact: true }).click();
      await dialog.getByText('Grade 2', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill('Living and Non-Living Things');

      const [genResponse] = await Promise.all([
        page.waitForResponse((res) => /\/assignments\/generate-(steps|ibpyp)/.test(res.url()), { timeout: 60000 }),
        page.getByText(/^Generate .*Assignment$/).last().click(),
      ]);

      expect(genResponse.ok(), 'a subject/grade combo with zero real curriculum content should not silently succeed').toBeFalsy();
    });
  });

  test('Hindi Language Acquisition generation (IB MYP) sends the correct language and produces real Devanagari script', async ({ browser }) => {
    // IB MYP's real ingested data DOES include "Language Acquisition" as a
    // genuine subject (unlike IB PYP, where the static list wrongly offers
    // it). This is the curriculum where the Language Acquisition +
    // language-chip UI paradigm actually matches the real subject model.
    const page = await newPageAs(browser, 'teacher-z');
    await withCurriculum('teacher-z', 'IB MYP', 'Grade 7', async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      const title = `E2E Hindi Assignment ${Date.now()}`;
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(title);
      await dialog.getByText('Language Acquisition', { exact: true }).click();
      await dialog.getByText('Hindi', { exact: true }).click();
      await dialog.getByText('Grade 7', { exact: true }).click();

      const [genRequest] = await Promise.all([
        page.waitForRequest((req) => /\/assignments\/generate-(steps|ibpyp)/.test(req.url()), { timeout: 60000 }),
        page.getByText(/^Generate .*Assignment$/).last().click(),
      ]);
      const body = genRequest.postDataJSON();
      expect(body.language).toBe('Hindi');
      expect(body.subject).toBe('Language Acquisition');

      await expect(page.getByText(/Generating.*Assignment/i)).not.toBeVisible({ timeout: 45000 });
      const bodyText = await page.locator('body').innerText();
      const hasHindiScript = /[ऀ-ॿ]/.test(bodyText);
      expect(hasHindiScript, 'generated content must contain real Devanagari script, not English-only fallback text').toBeTruthy();
    });
  });
});
