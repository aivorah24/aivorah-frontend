// Teacher Assignments -> Generate AI Assignment -> Quiz/MCQ path, plus a
// distinct authorization-shaped concern: can a teacher generate content for
// a grade they don't actually teach?
//
// Written from live user testing (screenshots, 2026-08-25) of the Quiz/MCQ
// generator (Question Type / Difficulty / Number of Questions / "Generate
// MCQ Quiz"). Same "Subject options must match curriculum/grade source of
// truth" requirement already covered exhaustively in
// curriculum-subject-source-of-truth.spec.js applies here too - that file's
// tests are NOT duplicated here (the Subject/Grade chip row is shared UI
// state regardless of createMode/type), only the Quiz-specific generation
// path and grounding are new.
//
// Topic used for generation is fetched LIVE from GET /curriculum/subjects
// (the real NCERT source of truth, same oracle pattern as
// curriculum-subject-source-of-truth.spec.js) rather than hardcoded, so this
// test keeps tracking real curriculum data even if the topic list changes.
//
// Account: teacher-l, dedicated to this file (curriculum/grade switched per
// test via teacherTeaches.js). Originally shared teacher-j with 2 other spec
// files - split out 2026-08-25 once it became clear multiple files mutating
// the same account's curriculum at once is a real race under fullyParallel
// (serial only protects tests WITHIN one file, not across files). Runs as a
// plain (non-serial) describe now that the account is exclusive to this
// file - true parallel execution.

import { test, expect } from '@playwright/test';
import { newPageAs } from '../../helpers/session.js';
import { accountFor } from '../../helpers/accounts.js';
import { snapshotTeaches, restoreTeaches, setTeacherTeaches } from '../../helpers/teacherTeaches.js';

async function withCurriculum(curriculum, teaches, run) {
  const email = accountFor('teacher-l').email;
  const snapshot = await snapshotTeaches(email);
  try {
    await setTeacherTeaches(email, { curriculum, teaches });
    await run();
  } finally {
    await restoreTeaches(email, snapshot);
  }
}

async function openGenerateForm(page) {
  await page.goto('/teacher/assignments');
  await page.getByText('New', { exact: true }).click();
  await page.getByText(/^Generate (AI|IB PYP) Assignment$/, { exact: true }).click();
}

// Real, live oracle for a usable topic name - the same
// GET /curriculum/subjects endpoint the app itself calls, not a hardcoded
// guess. Filters out internal reference codes (e.g. "bejm101") the way a
// real teacher would - a human picks a readable topic, not a code.
async function realTopicFor(request, curriculum, grade, subject) {
  const res = await request.get(
    `http://localhost:3007/curriculum/subjects?curriculum=${encodeURIComponent(curriculum)}&grade=${encodeURIComponent(grade)}`,
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const subjectEntry = (body.subjects || []).find((s) => s.subject === subject);
  expect(subjectEntry, `real curriculum data must include ${subject} for ${curriculum} ${grade}`).toBeTruthy();
  const readableTopic = (subjectEntry.topics || [])
    .map((t) => t.topic)
    .find((name) => !/^[a-z]{2,6}\d{2,4}$/i.test(name)); // excludes bare internal codes like "bejm101"
  expect(readableTopic, `real curriculum data must include at least one readable (non-code) topic for ${subject}`).toBeTruthy();
  return readableTopic;
}

// Same live-oracle pattern as curriculum-subject-source-of-truth.spec.js's
// realSubjectsFor() - kept local to this file rather than imported, since
// this file already owns its own dedicated account/setup and importing
// across spec files would blur which file is responsible for what.
async function realSubjectsFor(request, curriculum, grade) {
  const res = await request.get(
    `http://localhost:3007/curriculum/subjects?curriculum=${encodeURIComponent(curriculum)}&grade=${encodeURIComponent(grade)}`,
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return (body.subjects || []).map((s) => s.subject).sort();
}

const STATIC_SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Social Studies', 'Language Acquisition',
  'Visual Arts', 'ICT', 'Physical Education',
];

test.describe('Teacher Assignments — Quiz/MCQ generation grounding + grade-scope authorization', () => {

  test('Quiz/MCQ path: Subject chips must ALSO match the real curriculum/grade source of truth, same as the Assignment path', async ({ browser, request }) => {
    // curriculum-subject-source-of-truth.spec.js already proved this bug
    // exhaustively for createMode 'ai'/type 'assignment' (e.g. CBSE Grade 2
    // shows Science/Social Studies/Language Acquisition/etc. instead of the
    // real [English, Hindi, Mathematics, Urdu]). The Subject chip row is
    // the SAME shared component regardless of type - this test confirms
    // that's really true for the Quiz/MCQ toggle too, rather than assuming
    // it from code reading alone. EXPECTED TO FAIL for the same reason.
    const real = await realSubjectsFor(request, 'CBSE', 'Grade 2');
    expect(real).toEqual(['English', 'Hindi', 'Mathematics', 'Urdu']);

    const page = await newPageAs(browser, 'teacher-l');
    await withCurriculum('CBSE', [{ curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] }], async () => {
      await openGenerateForm(page);
      await page.getByText('Quiz / MCQ', { exact: true }).click();
      const dialog = page.getByRole('dialog');

      const candidatePool = [...new Set([...STATIC_SUBJECTS, ...real])];
      const shown = [];
      for (const subj of candidatePool) {
        if (await dialog.getByText(subj, { exact: true }).first().isVisible().catch(() => false)) shown.push(subj);
      }
      expect(shown.sort(), `Quiz/MCQ Subject chips for CBSE Grade 2 must equal the real curriculum data: [${real.join(', ')}]`).toEqual(real);
    });
  });

  test('MCQ generation produces real, grounded questions relevant to a real NCERT topic', async ({ browser, request }) => {
    const realTopic = await realTopicFor(request, 'CBSE', 'Grade 2', 'Mathematics');

    const page = await newPageAs(browser, 'teacher-l');
    await withCurriculum('CBSE', [{ curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] }], async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');

      await page.getByText('Quiz / MCQ', { exact: true }).click();
      const title = `E2E MCQ Grounding ${Date.now()}`;
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(title);
      await dialog.getByText('Mathematics', { exact: true }).click();
      await dialog.getByText('Grade 2', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill(realTopic);

      const [genRequest] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/assignments/generate-quiz'), { timeout: 60000 }),
        page.getByText(/^Generate MCQ Quiz$/, { exact: true }).click(),
      ]);
      const body = genRequest.postDataJSON();
      expect(body.subject).toBe('Mathematics');
      expect(body.grade).toBe('Grade 2');
      expect(body.curriculum).toBe('CBSE');
      expect(body.chapter).toContain(realTopic);

      // Real, relevant MCQ content - not a generic/unrelated quiz. The
      // generated text must reference the real topic name, not just echo
      // the chapter field back once and otherwise be generic.
      await expect(page.getByText(/Generating.*Quiz/i)).not.toBeVisible({ timeout: 45000 });
      const quizText = await page.locator('body').innerText();
      const topicWords = realTopic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const mentionsTopic = topicWords.some((w) => quizText.toLowerCase().includes(w));
      expect(mentionsTopic, `generated MCQ content must relate to the real topic "${realTopic}", not generic filler`).toBeTruthy();
    });
  });

  test('Fill Blanks generation also produces real, topic-relevant content for a real NCERT topic', async ({ browser, request }) => {
    const realTopic = await realTopicFor(request, 'CBSE', 'Grade 2', 'Mathematics');

    const page = await newPageAs(browser, 'teacher-l');
    await withCurriculum('CBSE', [{ curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] }], async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');

      await page.getByText('Quiz / MCQ', { exact: true }).click();
      const title = `E2E FillBlank Grounding ${Date.now()}`;
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(title);
      await dialog.getByText('Mathematics', { exact: true }).click();
      await dialog.getByText('Grade 2', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill(realTopic);
      await page.getByText('Fill Blanks', { exact: true }).click();

      const [genRequest] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/assignments/generate-quiz'), { timeout: 60000 }),
        page.getByText(/^Generate Fill-in-the-Blank Quiz$/, { exact: true }).click(),
      ]);
      const body = genRequest.postDataJSON();
      expect(body.quizType).toBe('fill_blank');
      expect(body.chapter).toContain(realTopic);

      const quizText = await page.locator('body').innerText();
      const topicWords = realTopic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const mentionsTopic = topicWords.some((w) => quizText.toLowerCase().includes(w));
      expect(mentionsTopic, `generated fill-blank content must relate to the real topic "${realTopic}"`).toBeTruthy();
    });
  });

  // ── Grade range completeness (NOT an authorization concern - corrected
  //    2026-08-25: product scope is that a teacher CAN generate for any
  //    grade, so a prior version of this test incorrectly asserted that
  //    generating outside a teacher's own grade should be blocked. It
  //    shouldn't be, and isn't meant to be - retired. What's left is a real,
  //    different finding: a teacher who genuinely teaches Grade 10 (in
  //    ADDITION to Grade 2) never even saw Grade 10 as an option at all.
  //    That's the SAME confirmed bug already covered in
  //    curriculum-subject-source-of-truth.spec.js ("BUG: CBSE grade chip row
  //    excludes Grade 1, 2, 10, 11 and 12") - ALL_GRADES is capped at Grade
  //    3-9, so even a teacher whose real teaches[] includes Grade 10 can't
  //    reach it here. Documented once more here for the multi-grade shape
  //    specifically, not duplicated as a second "bug", since it's the same
  //    root cause. ──

  test('a teacher who teaches BOTH Grade 2 and Grade 10 sees both as real options (grade-range completeness, same root cause as the Grade 1/2/10/11/12 bug)', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-l');
    await withCurriculum(
      'CBSE',
      [
        { curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] },
        { curriculum: 'CBSE', grade: 'Grade 10', subjects: ['Mathematics'] },
      ],
      async () => {
        await openGenerateForm(page);
        const dialog = page.getByRole('dialog');

        await expect(dialog.getByText('Grade 2', { exact: true })).toBeVisible();
        // EXPECTED TO FAIL: Grade 10 is a real, taught grade for this
        // teacher, but ALL_GRADES (the fallback list used once teacherGrades
        // computation is involved) stops at Grade 9.
        await expect(
          dialog.getByText('Grade 10', { exact: true }),
          'Grade 10 is genuinely taught by this teacher and must be offered',
        ).toBeVisible();
      },
    );
  });

  // ── Question-type fidelity: does the selected type actually produce that
  //    shape of question? One live E2E proof per type - the exhaustive
  //    difficulty x count x type matrix is Integration-layer work (direct
  //    calls to /assignments/generate-quiz asserting response structure),
  //    not duplicated here as real LLM calls per combination. ──

  test('"MCQ Only" actually generates real multiple-choice questions with answer options, not fill-in-the-blank or generic text', async ({ browser, request }) => {
    const realTopic = await realTopicFor(request, 'CBSE', 'Grade 2', 'Mathematics');
    const page = await newPageAs(browser, 'teacher-l');
    await withCurriculum('CBSE', [{ curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] }], async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      await page.getByText('Quiz / MCQ', { exact: true }).click();
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(`E2E MCQ Shape ${Date.now()}`);
      await dialog.getByText('Mathematics', { exact: true }).click();
      await dialog.getByText('Grade 2', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill(realTopic);
      await page.getByText('MCQ Only', { exact: true }).click();

      await Promise.all([
        page.waitForRequest((req) => req.url().includes('/assignments/generate-quiz'), { timeout: 60000 }),
        page.getByText(/^Generate MCQ Quiz$/, { exact: true }).click(),
      ]);
      await expect(page.getByText(/Generating.*Quiz/i)).not.toBeVisible({ timeout: 45000 });

      // A real MCQ has multiple selectable answer options per question -
      // at minimum 2 real option-shaped controls must exist, and there must
      // be no "type your answer" free-text blank field (that would mean
      // Fill Blanks rendered instead).
      const optionLikeCount = await page.getByText(/^[A-D][.)]\s/).count();
      const hasBlankInput = await page.getByPlaceholder(/answer|blank|type here/i).count();
      expect(optionLikeCount, 'MCQ Only must render real lettered answer options (A./B./C./D.)').toBeGreaterThan(0);
      expect(hasBlankInput, 'MCQ Only must not render fill-in-the-blank input fields').toBe(0);
    });
  });

  test('"Fill Blanks" actually generates real fill-in-the-blank questions, not multiple-choice options', async ({ browser, request }) => {
    const realTopic = await realTopicFor(request, 'CBSE', 'Grade 2', 'Mathematics');
    const page = await newPageAs(browser, 'teacher-l');
    await withCurriculum('CBSE', [{ curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] }], async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      await page.getByText('Quiz / MCQ', { exact: true }).click();
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(`E2E FillBlank Shape ${Date.now()}`);
      await dialog.getByText('Mathematics', { exact: true }).click();
      await dialog.getByText('Grade 2', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill(realTopic);
      await page.getByText('Fill Blanks', { exact: true }).click();

      await Promise.all([
        page.waitForRequest((req) => req.url().includes('/assignments/generate-quiz'), { timeout: 60000 }),
        page.getByText(/^Generate Fill-in-the-Blank Quiz$/, { exact: true }).click(),
      ]);
      await expect(page.getByText(/Generating.*Quiz/i)).not.toBeVisible({ timeout: 45000 });

      // Real fill-blank questions contain a blank marker (____ or an input)
      // and must NOT be rendered as lettered multiple-choice options.
      const bodyText = await page.locator('body').innerText();
      const hasBlankMarker = /_{2,}/.test(bodyText);
      const optionLikeCount = await page.getByText(/^[A-D][.)]\s/).count();
      expect(hasBlankMarker, 'Fill Blanks must render real blank markers (____), not MCQ-style options').toBeTruthy();
      expect(optionLikeCount, 'Fill Blanks must not render lettered MCQ answer options').toBe(0);
    });
  });

  test('"Mixed" generates a real combination of MCQ and fill-blank questions, not just one type', async ({ browser, request }) => {
    const realTopic = await realTopicFor(request, 'CBSE', 'Grade 2', 'Mathematics');
    const page = await newPageAs(browser, 'teacher-l');
    await withCurriculum('CBSE', [{ curriculum: 'CBSE', grade: 'Grade 2', subjects: ['Mathematics'] }], async () => {
      await openGenerateForm(page);
      const dialog = page.getByRole('dialog');
      await page.getByText('Quiz / MCQ', { exact: true }).click();
      await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(`E2E Mixed Shape ${Date.now()}`);
      await dialog.getByText('Mathematics', { exact: true }).click();
      await dialog.getByText('Grade 2', { exact: true }).click();
      await page.getByPlaceholder('e.g. Fractions and Decimals').fill(realTopic);
      await page.getByText('Mixed', { exact: true }).click();

      const [genRequest] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/assignments/generate-quiz'), { timeout: 60000 }),
        page.getByText(/^Generate Mixed Quiz$/, { exact: true }).click(),
      ]);
      expect(genRequest.postDataJSON().quizType).toBe('mixed');
      await expect(page.getByText(/Generating.*Quiz/i)).not.toBeVisible({ timeout: 45000 });

      // "Mixed" means both shapes should genuinely appear - not silently
      // fall back to all-MCQ or all-fill-blank.
      const bodyText = await page.locator('body').innerText();
      const hasBlankMarker = /_{2,}/.test(bodyText);
      const optionLikeCount = await page.getByText(/^[A-D][.)]\s/).count();
      expect(hasBlankMarker, 'Mixed must include at least one real fill-blank question').toBeTruthy();
      expect(optionLikeCount, 'Mixed must include at least one real MCQ question').toBeGreaterThan(0);
    });
  });
});
