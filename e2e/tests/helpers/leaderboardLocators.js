// Shared locators for LeaderboardScreen.tsx. Confirmed against the real
// rendered DOM (dumped from a live authenticated session) - no
// testID/accessibilityRole anywhere on this screen, same as the rest of
// the app.

// A scope tab ("School" / "Grade" / "Curriculum" / "Overall"). CONFIRMED
// via a real run: "Grade" collides with the table's OWN "Grade" column
// header (thGrade renders the literal text "Grade" when wide) - the tabs
// row renders BEFORE the table in JSX/DOM order, so .first() reliably picks
// the real tab, not the column header.
export function tab(page, label) {
  return page.getByText(label, { exact: true }).first();
}

// A table row, scoped by the student's own name. CONFIRMED via a real run:
// ranks 1-3 render their name TWICE (once on the podium, once in the table)
// - the podium renders BEFORE the table card in JSX/DOM order, so .last()
// reliably picks the table occurrence for every rank (ranks 4+ only ever
// have one occurrence, so .last() is still correct there too). Ancestor
// depth confirmed via live DOM dump: name text -> parent (nameWrapper,
// flex-row) -> parent (thStudent's inner flex:1 wrapper) -> parent
// (thStudent itself, holds avatar + inner wrapper) -> parent (the row `tr`,
// which holds thRank/thStudent/thGrade/thXp/thStreak as direct children) -
// four ancestor divs up from the name.
export function tableRow(page, name) {
  return page.getByText(name, { exact: true }).last().locator('xpath=ancestor::div[4]');
}

// A podium card (top-3 only), scoped by name. CONFIRMED via live DOM dump:
// name text -> parent (flex:1 wrapper holding name + score) -> parent
// (the podium card itself, holds medal badge + avatar + that wrapper +
// trophy icon) - two ancestor divs up from the name.
export function podiumCard(page, name) {
  return page.getByText(name, { exact: true }).first().locator('xpath=ancestor::div[2]');
}

export function emptyMessage(page) {
  return page.getByText('No rankings in this view yet.', { exact: true });
}

export function viewFullButton(page) {
  return page.getByText('View Full Leaderboard', { exact: true });
}

// The "my rank" card's own text elements - simple exact-text lookups since
// their content is fully deterministic given known mock data.
export function rankCardTitle(page) {
  return page.getByText(/^(You're doing great!|Not ranked yet)$/);
}

export function rankCardRankValue(page) {
  return page.getByText(/^#\d+$/);
}
