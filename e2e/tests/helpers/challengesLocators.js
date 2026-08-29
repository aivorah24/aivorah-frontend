// Shared locators for ChallengesScreen.tsx, confirmed against the real
// running app's DOM (all the cards/tabs/options below are bare
// TouchableOpacitys with NO accessibilityRole/accessibilityLabel - so most
// of these deliberately do NOT use getByRole, except where the app already
// gets a real role for free (the RN Modal renders role="dialog").

export function tab(page, name) {
  // Tab label and its count badge are separate <Text> leaves under the same
  // TouchableOpacity ("Available" + "40" render as sibling text nodes, not
  // one string) - exact:true on just the label is unambiguous.
  return page.getByText(name, { exact: true }).first();
}

// The little number badge next to a tab label (e.g. the "7" in
// "Available 7") - ChallengesScreen.tsx only renders it when count > 0, so
// this locator resolves to nothing when a tab's count is 0 (check
// toHaveCount(0) in that case, not toBeVisible()). Confirmed via the real
// DOM: the badge number is NOT a direct sibling of the label - it's nested
// one level deeper inside its own wrapper <div> (the colored pill), which
// itself has no dir="auto" so it can't be matched directly.
export function tabCount(page, name) {
  return tab(page, name).locator('xpath=following-sibling::div[1]//div[@dir="auto"]');
}

// A stat tile's number (e.g. "850" in the "Total XP" card). Confirmed via
// the real DOM: each card is [icon glyph (empty text), value, label] in that
// order. XPath's preceding-sibling axis counts backwards from the label
// (position 1 = closest = icon glyph, not the value) - .last() uses
// Playwright's own document-order semantics instead, which reliably lands
// on the value (the closest preceding sibling in the actual page order).
//
// The "Challenges" stat label collides with the screen's own page-title
// text ("Challenges", in the Header) - .last() on the label match too picks
// the stat tile's one, since the Header renders first in the DOM.
export function statTileValue(page, label) {
  return page
    .getByText(label, { exact: true })
    .last()
    .locator('xpath=preceding-sibling::div[@dir="auto"]')
    .last();
}

// A challenge card's "Start Challenge" / "Start Now" action. Cards have no
// data-testid or accessible name, so scope by the card's own title text
// (unique per challenge) and grab the action within that card's ancestor.
export function startButtonForCard(page, title) {
  return page
    .getByText(title, { exact: true })
    .first()
    .locator('xpath=ancestor::div[.//div[contains(text(),"Start")]][1]')
    .getByText(/^(Start Challenge|Start Now)$/);
}

export function quizModal(page) {
  // RN's <Modal> gives this a real role="dialog" for free - the one
  // genuinely accessible landmark on the whole screen.
  return page.getByRole('dialog');
}

// The X close icon - a bare TouchableOpacity with no label/testID. Confirmed
// via DOM read: it is the ONLY tabindex="0" element inside the modal header
// row (the title and timer blocks around it aren't focusable), so it is the
// first tabindex="0" descendant of the dialog.
export function closeQuizButton(page) {
  return quizModal(page).locator('[tabindex="0"]').first();
}

export function questionBlock(page, questionNumber, totalQuestions) {
  const marker = page.getByText(`Q${questionNumber} of ${totalQuestions}`, { exact: true });
  return marker.locator('xpath=..');
}

export function submitAnswersButton(page) {
  return page.getByText('Submit Answers', { exact: true }).locator('xpath=..');
}

export function timerDisplay(page) {
  return page.locator('text=/^\\d{2}:\\d{2}$/');
}

export function resultScore(page) {
  return page.locator('text=/^\\d{1,3}%$/').first();
}

export function doneButton(page) {
  return page.getByText('Done', { exact: true });
}
