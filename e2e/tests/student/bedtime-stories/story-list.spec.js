// This file tests the STUDENT BEDTIME STORIES list screen
// (BhagavathaStoriesScreen.tsx) - where a student browses story collections
// (Srimad Bhagavatam / Ramayana / Bhagavad Gita / Mahabharata Tales / The
// Mahabharata) and picks a story to read.
//
// We test:
// 1. The screen loads (loading spinner, then hero + grouped story cards).
// 2. Two different cards, from two different collections, each navigate to
//    THAT story's reader with the correct title - proves routing passes the
//    real storyId/storyTitle per card, not a hardcoded first-card link.
// 3. Empty state: server returns zero stories.
// 4. Error state: the /stories request fails outright.
//
// PREMIUM_ENABLED is hard-coded `false` in BhagavathaStoriesScreen.tsx right
// now (confirmed by reading the source), so every card is unlocked and the
// premium/upgrade banner never renders - no lock-state test here on purpose.
// Revisit once that flag is flipped back on.
//
// Uses student-a (shared, read-only) - this screen only ever reads
// GET /stories, it never writes anything to the student's account.
//
// KNOWN APPLICATION BUG (found while running this suite, reported not
// worked around): a direct browser navigation to '/stories' does NOT open
// this screen - it hits the real backend REST route `GET /stories`
// (server/index.js: `app.use('/stories', storiesRoute)`) and renders raw
// JSON instead of the app. Confirmed live: page.goto('/stories') produced a
// page whose entire accessibility tree was the raw stories JSON array, no
// app chrome at all. server/index.js has a `SPA_PATHS` allowlist (line
// ~107) specifically to redirect direct/refresh navigation on SPA routes
// back to index.html instead of hitting a same-named API route - it already
// covers '/assignments', '/schedule', '/dashboard', etc., but '/stories'
// (Bedtime Stories) was missing from that list. Practical impact: a student
// who refreshes the browser while on the Bedtime Stories screen, or opens a
// shared/bookmarked link to it, sees broken JSON instead of the app.
// Worked around here by reaching the screen the way most real usage does -
// through in-app navigation from the dashboard - not by testing the broken
// direct-URL behavior as if it were correct.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import { storyCard } from '../../helpers/bedtimeStoryLocators.js';

const ACCOUNT = 'student-a';

// Two real stories from two different collections (confirmed against
// server/data/bhagavata_stories.json) - deliberately not the very first
// card, so the spot-check can't accidentally pass just because routing
// happens to default to index 0.
const CARD_A = { id: 'hanuman', title: 'Hanuman the Brave', collection: 'Ramayana' };
const CARD_B = { id: 'bhagavad_gita_arjuna', title: 'Arjuna and Krishna', collection: 'Bhagavad Gita' };

// '/dashboard' IS in server/index.js's SPA_PATHS allowlist, so it's a safe
// direct entry point - then click through in-app, the same way a real
// student reaches this screen (see the KNOWN APPLICATION BUG note above for
// why '/stories' itself can't be goto()'d directly).
async function openBedtimeStories(page) {
  await page.goto('/dashboard');
  await dismissAnnouncementIfPresent(page);
  // Two copies of the sidebar exist at once (mobile + desktop layout) - same
  // duplicate-layout situation dashboard.spec.js already documents for its
  // own sidebar click - the visible, topmost (last) one is the real one.
  await page.getByText('Bedtime Stories', { exact: true }).filter({ visible: true }).last().click();
  await expect(page.getByText('Bedtime Stories for Children', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await dismissAnnouncementIfPresent(page);
}

test.describe('Student Bedtime Stories - list', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('page loads with the hero banner and grouped story cards', async ({ page }) => {
    await openBedtimeStories(page);

    await expect(page.getByText('Bhagavatam · Ramayana · Bhagavad Gita', { exact: true })).toBeVisible();

    // Collection section headers - grouped by real `collection` field from
    // the API, not a flat list.
    await expect(page.getByText('Srimad Bhagavatam', { exact: true })).toBeVisible();
    await expect(page.getByText('Ramayana', { exact: true })).toBeVisible();
    await expect(page.getByText('Bhagavad Gita', { exact: true })).toBeVisible();

    // At least one real card with its meta badges (page count + age group),
    // not just that some text is on screen.
    const card = storyCard(page, CARD_A.title);
    await expect(card).toBeVisible();
    await expect(page.getByText(/^\d+ pages$/).first()).toBeVisible();
    await expect(page.getByText(/^Age /).first()).toBeVisible();
  });

  test('opening a Ramayana story navigates to that story\'s reader with the correct title', async ({
    page,
  }) => {
    await openBedtimeStories(page);

    await storyCard(page, CARD_A.title).click();

    // Reader screen's top bar shows the real title + collection for the
    // story that was actually clicked (StoryReaderScreen.tsx topTitle/topSub).
    //
    // FOUND WHILE RUNNING: after an in-app navigation (unlike a direct deep
    // link), React Navigation leaves a zero-size (w:0 h:0) stale copy of the
    // previous screen's matching text still mounted - confirmed via a live
    // getBoundingClientRect() check. `.first()` alone can land on that
    // invisible leftover instead of the real one - filter to the actually
    // visible element, same convention dashboard.spec.js already uses for
    // its own stale-duplicate sidebar issue.
    await expect(
      page.getByText(CARD_A.title, { exact: true }).filter({ visible: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(CARD_A.collection, { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    // The reader's own content has loaded, not stuck on "Opening story…".
    await expect(page.getByText('Opening story…', { exact: true })).toHaveCount(0);
  });

  test('opening a different story from a different collection routes to its own content, not the previous one', async ({
    page,
  }) => {
    await openBedtimeStories(page);

    await storyCard(page, CARD_B.title).click();

    await expect(
      page.getByText(CARD_B.title, { exact: true }).filter({ visible: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(CARD_B.collection, { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    // Proves this isn't just always landing on CARD_A's content regardless
    // of which card was clicked. Filtered to visible matches only - the
    // previous list screen's own "Hanuman the Brave" card is left mounted
    // at zero size after navigating away (same stale-leftover pattern noted
    // above), which would otherwise make a plain toHaveCount(0) fail on a
    // harmless invisible leftover rather than a real bug.
    await expect(
      page.getByText(CARD_A.title, { exact: true }).filter({ visible: true }),
    ).toHaveCount(0);
  });

  test('shows a friendly empty-state when there are no bedtime stories at all', async ({ page }) => {
    // Now that entry is via '/dashboard' + an in-app click (not a direct
    // goto('/stories') document load - see the KNOWN APPLICATION BUG note
    // above), '**/stories' can only ever match the real fetch() call this
    // screen makes, not a page navigation - no resourceType scoping needed.
    await page.route('**/stories', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    await openBedtimeStories(page);

    // No collection headers, no cards, and the loading/error copy is gone -
    // just the hero banner on an otherwise-empty screen.
    await expect(page.getByText('Loading stories…', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Could not load stories. Please try again.', { exact: true })).toHaveCount(0);
    await expect(page.getByText(CARD_A.title, { exact: true })).toHaveCount(0);
  });

  test('shows an error message when the story list cannot be loaded', async ({ page }) => {
    await page.route('**/stories', (route) => route.abort());

    // The hero banner renders unconditionally regardless of load outcome
    // (BhagavathaStoriesScreen.tsx), so openBedtimeStories()'s own wait for
    // it still holds true here even though the fetch is about to fail.
    await openBedtimeStories(page);

    await expect(
      page.getByText('Could not load stories. Please try again.', { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(storyCard(page, CARD_A.title)).toHaveCount(0);
  });
});
