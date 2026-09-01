// Shared locators for DailyHabitsScreen.tsx. Confirmed against the real
// rendered DOM (dumped from a live authenticated session with a real
// created habit task) - not guessed. No testID/accessibilityRole anywhere
// on this screen, same as the rest of the app.

// A stat tile's number (Day Streak / Total Coins / Today). Identical
// structure to ChallengesScreen's own stat tiles (confirmed via the live
// dump): each card is [icon glyph (empty text), value, label] as three
// sibling divs - same xpath pattern challengesLocators.js's
// statTileValue() already uses for that identical layout.
export function statTileValue(page, label) {
  return page
    .getByText(label, { exact: true })
    .last()
    .locator('xpath=preceding-sibling::div[@dir="auto"]')
    .last();
}

// The "N of M habits completed" / "All habits done! Amazing!" line.
export function progressSummaryText(page) {
  return page.getByText(/^(\d+ of \d+ habits completed|All habits done! Amazing!)$/);
}

export function emptyHabitsMessage(page) {
  return page.getByText('No habits yet', { exact: true });
}

// A habit card's own clickable container, scoped by its label text.
// CONFIRMED via live DOM dump: label div -> parent (flex:1 wrapper, holds
// label + coins row) -> parent again (the actual tabindex=0 TouchableOpacity
// card, which also holds the icon and checkbox as siblings of the wrapper) -
// so ancestor::div[2] from the label lands on the card itself.
export function habitCard(page, label) {
  return page.getByText(label, { exact: true }).first().locator('xpath=ancestor::div[2]');
}

// The card's checkbox - CONFIRMED its stable position is the 3rd direct
// child (0-based index 2): [iconWrap, flexWrapper(label+coins), checkbox,
// (coinPop only while popping)]. Using nth(2) rather than :last-child
// because the coin-pop element renders as a 4th sibling AFTER the checkbox
// while its animation is showing, which would otherwise displace :last().
export function habitCheckbox(page, label) {
  return habitCard(page, label).locator('> div').nth(2);
}

// The transient "+N" coin-pop badge - only present while popping (coinPop
// state, DailyHabitsScreen.tsx clears it after 1800ms). 4th direct child,
// only rendered conditionally.
export function habitCoinPop(page, label) {
  return habitCard(page, label).locator('> div').nth(3);
}
