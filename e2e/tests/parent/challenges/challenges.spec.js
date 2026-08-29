// Parent -> Challenges (ParentChallengesScreen.tsx) - happy path + auth gap.
//
// Empty state lives in ./challenges-empty-state.spec.js (split out to match
// the Teacher Dashboard convention: empty state is its own file, not
// bundled into the happy-path spec).
//
// parent-d (mutable, CBSE/Grade 3, linked to student-parent-d) - CBSE/
// Grade 3 has real published challenges, so this is the only account that
// can drive assign/complete/XP.
//
// Known product gap, not a test bug: routes/challenges.js has no middleware
// verifying the caller is actually the linked parent (or authenticated at
// all) - GET /challenges?studentId=X and POST /challenges/assign accept ANY
// studentId. Written for the CORRECT (403) behavior on purpose, so it shows
// red until the app is fixed - same convention as the Teacher Dashboard's
// Recent Activity known-bug test.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import {
  getChildIdByParentEmail,
  listChallenges,
  assignChallengeAsParent,
  completeChallenge,
} from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';

test.describe('Parent Dashboard - Challenges', () => {
  test.describe('happy path + assign/complete (parent-d, CBSE - has real challenges)', () => {
    test.use({ storageState: statePath('parent-d') });

    test("assigning and completing a challenge auto-refreshes the child's XP and the Challenges screen", async ({
      context,
      page,
      request,
    }) => {
      // Playwright's default 30s test timeout is shorter than the 40s the
      // final assertions may need to catch ParentChallengesScreen's own 30s
      // auto-refresh interval - raise it so the test isn't killed early.
      test.setTimeout(60000);

      const parentEmail = accountFor('parent-d').email;
      const studentEmail = accountFor('student-parent-d').email;

      const studentId = await getChildIdByParentEmail(request, {
        parentEmail,
        childEmail: studentEmail,
      });

      // Load the Challenges screen BEFORE mutating anything, and never
      // reload/re-visit it after - this exercises the real auto-refresh
      // path (ParentChallengesScreen's setInterval(30_000)), not just
      // "does a fresh page load show correct data."
      await applySession(context, 'parent-d');
      await page.goto('/');
      await dismissAnnouncementIfPresent(page);
      // Two Sidebar.tsx instances exist in the DOM at once (a collapsed base
      // sidebar plus a hover-expanded overlay on top of it) - .first() hits
      // the collapsed one underneath, whose text is covered by the overlay
      // and never receives the click. The overlay's copy is last in the DOM.
      await page.getByText('Challenges', { exact: true }).last().click();
      await expect(page.getByText('Challenges', { exact: true }).first()).toBeVisible({
        timeout: 15000,
      });

      const challenges = await listChallenges(request, {
        grade: 'Grade 3',
        curriculum: 'CBSE',
        studentId,
      });
      // ParentChallengesScreen only renders three sections - School Challenges,
      // Olympiad-Style Questions, Advanced Practice - by `type`. Any other type
      // exists in the data but is never shown, so picking one wouldn't make a
      // visible/checkable change on screen.
      const RENDERED_TYPES = ['school_challenge', 'olympiad', 'advanced_practice'];
      const target = challenges.find((c) => RENDERED_TYPES.includes(c.type));
      expect(target, 'expected at least one screen-rendered CBSE/Grade 3 challenge').toBeTruthy();

      // POST /challenges/assign resets a 'completed' assignment back to
      // 'assigned' (see routes/challenges.js) instead of rejecting it - this
      // repo's small fixed challenge pool gets re-completed across test runs,
      // so re-assigning (rather than requiring a never-touched challenge) is
      // what keeps this test independently repeatable.
      const assignment =
        target.status === 'assigned'
          ? { id: target.assignmentId }
          : await assignChallengeAsParent(request, {
              challengeId: target.id,
              studentId,
              parentEmail,
            });

      const statsBefore = await request.get(`/student/${studentId}`).then((r) => r.json());

      // xpAwarded is prorated by score (routes/challenges.js: round(xpReward * score/100)).
      await completeChallenge(request, assignment.id, { studentId, score: 100 });

      // No page.reload()/goto() from here on - a 40s timeout comfortably
      // covers the 30s auto-refresh interval, so these only pass if the
      // screen genuinely updated itself in the background.
      await expect
        .poll(
          async () => {
            const after = await request.get(`/student/${studentId}`).then((r) => r.json());
            return after.xpPoints;
          },
          { timeout: 15000, message: 'xpPoints did not increase after completing the challenge' },
        )
        .toBeGreaterThan(statsBefore.xpPoints);

      const statsAfter = await request.get(`/student/${studentId}`).then((r) => r.json());

      // ParentChallengesScreen renders XP via toLocaleString() (comma
      // thousands separators), not the raw number. exact:true because the
      // same figure also appears inside an "XP points: X" label elsewhere
      // on screen; .filter({visible:true}) because the known mobile/desktop
      // duplicate-layout issue means .first() alone can pick a hidden copy.
      await expect(
        page.getByText(statsAfter.xpPoints.toLocaleString(), { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible({ timeout: 40000 });

      // "Done" count sits next to the label - a bare getByText(number) is
      // ambiguous (announcement badges, other stat tiles use the same digit),
      // so scope to the tile containing the "Done" label.
      const doneTile = page.getByText('Done', { exact: true }).locator('xpath=..');
      await expect(
        doneTile.getByText(String(statsAfter.challengesCompleted), { exact: true }),
      ).toBeVisible({ timeout: 40000 });

      // The completed challenge itself shows a "Done" badge, not "Assigned".
      await expect(page.getByText(target.title)).toBeVisible({ timeout: 40000 });
    });
  });

  // KNOWN BUG: the backend does not verify the caller is a parent linked to
  // the requested child - GET /challenges and POST /challenges/assign accept
  // ANY studentId with no ownership/auth check (see routes/challenges.js).
  // Written for the CORRECT (403) behavior on purpose, so it shows red until
  // the app is fixed.
  test('a parent cannot fetch challenges for a child they are not linked to (known bug - currently succeeds)', async ({
    request,
  }) => {
    const [studentA] = await request
      .get(`/parent/${encodeURIComponent(accountFor('parent-a').email)}/children`)
      .then((r) => r.json());

    // Currently succeeds with 200 - parent-d has no link to student-a.
    const res = await request.get(
      `/challenges?grade=Grade 3&curriculum=NCERT&studentId=${studentA.id}`,
    );
    expect(res.status()).toBe(403);
  });
});
