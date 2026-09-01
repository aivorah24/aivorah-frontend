// Shared locators for BhagavathaStoriesScreen.tsx (the "Bedtime Stories"
// list) and StoryReaderScreen.tsx (the reader/player). Confirmed against the
// real source - neither screen has any testID/accessibilityLabel, so these
// follow the same getByText + xpath ancestor/sibling pattern already used in
// challengesLocators.js.

// A story card on the list screen, found by its own title (BhagavathaStoriesScreen.tsx
// renders [cover, title, subtitle, meta badges] inside one TouchableOpacity per card -
// exact:true on the title is unambiguous since story titles are unique).
export function storyCard(page, title) {
  return page.getByText(title, { exact: true }).first();
}

// The "Listen" / "Pause" / "Resume" / "Loading…" button on the reader screen.
// It's the only TouchableOpacity in the controls row whose label is one of
// these four strings, so a regex match on the label text is unambiguous.
export function listenButton(page) {
  return page.getByText(/^(Listen|Pause|Resume|Loading…)$/).first();
}

// Narrator chips ("Grandmother" / "Grandfather").
export function narratorChip(page, label) {
  return page.getByText(label, { exact: true }).first();
}

// The "Auto" toggle chip.
export function autoChip(page) {
  return page.getByText('Auto', { exact: true }).first();
}

// A playback-speed chip ("0.5x", "1x", "1.5x", "2x").
export function speedChip(page, rate) {
  return page.getByText(`${rate}x`, { exact: true }).first();
}

// "N / total" page indicator chip shown over the page image.
export function pageChip(page, current, total) {
  return page.getByText(`${current} / ${total}`, { exact: true });
}

// Bottom-nav "page of" label (e.g. "2" then "of 6" as separate text nodes -
// StoryReaderScreen.tsx renders navPageNum/navPageOf as nested <Text>, so
// match on the "of N" fragment alone, which is unique per story).
export function pageOfLabel(page, total) {
  return page.getByText(`of ${total}`, { exact: true });
}

// nextPageButton/backPageButton/progressDot: CONFIRMED against the real
// rendered DOM (dumped from a live authenticated session on the Story
// Reader screen, ambarisha/page 1) - not a guess. Bottom nav is exactly
// [backArrow, centerLabel(navPageNum > "N" + nested "of total" span),
// nextArrow|Finish] as three direct-child divs of one container; the
// page-of-total span sits 2 divs below that container (span -> navPageNum
// div -> navCenter div -> the container itself), so ancestor::div[3] from
// the span lands on the container.

export function nextPageButton(page, total) {
  return pageOfLabel(page, total).locator('xpath=ancestor::div[3]/div[last()]');
}

export function backPageButton(page, total) {
  return pageOfLabel(page, total).locator('xpath=ancestor::div[3]/div[1]');
}

export function finishButton(page) {
  return page.getByText('Finished', { exact: true });
}

// A progress dot in the top bar (0-based index). CONFIRMED against the real
// DOM: the dot row is a direct sibling of the title/collection column (both
// children of the same top-bar row) - title -> its parent (the column div)
// -> that column's next sibling (the dot row) -> its 7 direct children are
// the dots themselves.
export function progressDot(page, storyTitle, index) {
  return page
    .getByText(storyTitle, { exact: true })
    .first()
    .locator('xpath=ancestor::div[1]/following-sibling::div[1]/div')
    .nth(index);
}

export function resumeBanner(page) {
  return page.getByText(/^Continuing from page \d+$/);
}

export function startOverButton(page) {
  return page.getByText('Start over', { exact: true });
}
