// Shared locators for ProgressScreen.tsx (My Progress). Confirmed against
// the real rendered DOM (dumped from a live authenticated session for
// student-a) - no testID/accessibilityRole anywhere on this screen, same
// as the rest of the app.

// A hero stat / week-total value (Study Time, XP Points, Day Streak,
// Topics Done, Credits, Total Study, XP Earned, Topics). CONFIRMED via
// live DOM dump: each pair renders as [value div, label div] as direct
// siblings under one wrapper - the value is the label's immediate
// preceding sibling, no ancestor climb needed.
export function statValue(page, label) {
  return page.getByText(label, { exact: true }).locator('xpath=preceding-sibling::div[1]');
}

export function heroTitle(page) {
  // One of four fixed strings depending on overallPct - callers assert the
  // exact one they expect.
  return page.getByText(
    /^(Ready to start learning!|Great start, keep going!|Amazing progress this week!|Outstanding work!)$/,
  );
}

export function heroSub(page) {
  return page.getByText(/^\d+ of \d+ topics completed · \d+-day streak · Level \d+$/);
}

export function overallPctText(page) {
  // CONFIRMED via a real run: in-app (SPA) navigation can leave duplicate
  // hidden copies of the screen mounted, each with their own "0%" ring
  // text - .filter({ visible: true }) excludes those, same pattern this
  // repo's sidebar-click locators already use for duplicate-layout DOM.
  return page.getByText(/^\d+%$/).filter({ visible: true }).first();
}

// A Week/Month period tab. CONFIRMED unique - "Week"/"Month" appear
// nowhere else on the screen.
export function periodTab(page, label) {
  return page.getByText(label, { exact: true });
}

export function emptyWeeklyMessage(page) {
  return page.getByText('No activity yet this week.', { exact: false });
}

// A day's bar-chart minute label (e.g. "45m") - only rendered when that
// day's studyMinutes > 0 (DailyHabits-style conditional text).
export function barMinuteLabel(page, minutesText) {
  return page.getByText(minutesText, { exact: true });
}

// A completed-topic chip, scoped by its topic label.
export function topicChip(page, topic) {
  return page.getByText(topic, { exact: true });
}

// An achievement card, scoped by its label. CONFIRMED via live DOM dump:
// same direct-child structure as subjectCard - label div's parent is the
// card itself.
export function achievementCard(page, label) {
  return page.getByText(label, { exact: true }).locator('xpath=ancestor::div[1]');
}

export function achievementLockedText(page, label) {
  return achievementCard(page, label).getByText('Locked', { exact: true });
}

export function unlockedCountText(page) {
  return page.getByText(/^\d+\/8 unlocked$/);
}
