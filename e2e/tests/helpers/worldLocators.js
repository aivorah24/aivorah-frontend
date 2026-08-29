// Shared locators for WorldAndYouScreen.tsx + the embedded DailyTidbitCard.tsx
// ("The World & You" - GK Fact / Current Affairs / quiz / On This Day /
// Brain Teaser). Confirmed against the real source (no testID/
// accessibilityRole/accessibilityLabel exists anywhere in either file - both
// grepped directly, zero matches), so everything here is a bare
// TouchableOpacity/Text scoped by its own literal copy or, for dynamic
// content (GK fact, headline, quiz questions/options), by the exact text
// captured from the real API response the test itself observed - never a
// hardcoded guess at what today's AI-generated content will say.

export function openWorldAndYou(page) {
  // Direct navigation, not the sidebar link click - see scheduleLocators.js's
  // openSchedule() for why (sidebar click intermittently intercepted by an
  // overlapping element in this app; direct goto is faster and reliable, and
  // this repo's other specs already follow the same pattern for this reason).
  return page.goto('/world-and-you');
}

// ── WorldAndYouScreen (On This Day / Brain Teaser) ──────────────────────────

// "The World & You" text renders 3 times on this page (confirmed via a live
// failure snapshot): the collapsed icon-rail sidebar, the full expanded
// sidebar drawer, AND the actual Header title - both sidebars render before
// the Header in DOM order, so .last() reliably picks the real page header
// (same technique challengesLocators.js's statTileValue() uses for its own
// title/sidebar text collision).
export function worldHeader(page) {
  return page.getByText('The World & You', { exact: true }).last();
}

export function worldLoadError(page) {
  return page.getByText('Could not load today\'s content. Please try again.', { exact: true });
}

export function revealAnswerButton(page) {
  return page.getByText('Reveal Answer', { exact: true });
}

// ── DailyTidbitCard (GK Fact / Current Affairs / quiz) ──────────────────────

export function tidbitTab(page, name) {
  // name: 'GK Fact' | 'Current Affairs'
  return page.getByText(name, { exact: true });
}

export function tidbitLoadError(page) {
  return page.getByText('Couldn\'t load. Tap refresh to try again.', { exact: true });
}

// NOTE: the refresh icon button (DailyTidbitCard.tsx:246-248) has no
// testID/accessibilityLabel and no unique text - a locator for it hasn't
// been added here because it can't be confirmed against the live DOM in
// this pass (would need reading the actual rendered HTML, same as every
// other locator in this file). It's also low-value to test as-is: reading
// the source shows loadTidbit() checks AsyncStorage BEFORE the network
// fetch, so pressing refresh on a day that's already cached is a no-op
// that never reaches the server - see the spec file's header comment for
// why this is flagged as a product discrepancy rather than tested as
// correct behavior. Add `testID="world-refresh-tidbit"` to that
// TouchableOpacity if this needs covering later.

export function startQuizButton(page) {
  return page.getByText('Test Your Knowledge', { exact: true });
}

export function quizErrorText(page) {
  return page.getByText('Could not load quiz. Please try again.', { exact: true });
}

export function quizGenerating(page) {
  return page.getByText('Generating quiz...', { exact: true });
}

export function quizAlreadyDoneBanner(page) {
  return page.getByText('Quiz done today! Come back tomorrow.', { exact: true });
}

// The "Question X of Y" counter, and its containing box - scoping quiz
// option locators inside this box keeps them from ever matching stray text
// elsewhere on the page.
export function quizCounter(page, current, total) {
  return page.getByText(`Question ${current} of ${total}`, { exact: true });
}

export function quizBox(page) {
  return page.locator('text=/^Question \\d+ of \\d+$/').locator('xpath=..');
}

export function quizQuestionText(page, questionText) {
  return quizBox(page).getByText(questionText, { exact: true });
}

// A quiz option's own visible text (unique per question - 4 distinct
// choices). Use quizOptionButton() instead when you need to click it or
// check its highlight color, since the button is the text's own parent
// TouchableOpacity/div.
export function quizOption(page, optionText) {
  return quizBox(page).getByText(optionText, { exact: true });
}

export function quizOptionButton(page, optionText) {
  return quizOption(page, optionText).locator('xpath=..');
}

export function quizDoneBanner(page) {
  // Matches either "Perfect score!" or "N/M correct" - callers assert the
  // exact expected text via a plain getByText() with the real computed
  // string; this is only for "is SOME done-state banner showing" checks.
  return page.locator('text=/Perfect score!|^\\d+\\/\\d+ correct$/');
}

export function xpEarnedText(page, xp) {
  return page.getByText(`+${xp} XP earned`, { exact: true });
}
