// A platform-wide announcement banner (e.g. "Scheduled platform downtime")
// sometimes renders above screen content and intercepts clicks on anything
// beneath it until dismissed - confirmed via a Playwright error-context
// snapshot on the Parent Dashboard, where a click kept failing with
// "subtree intercepts pointer events" until this was dismissed first.
//
// It doesn't always render immediately (async fetch), so an instant
// isVisible() check can miss it and let it appear a moment later, right
// as a test tries to click something underneath it - poll for a short
// window instead of checking once.
export async function dismissAnnouncementIfPresent(page, { timeout = 4000 } = {}) {
  const dismissButton = page.getByRole('button', { name: /Dismiss announcement/i }).first();
  try {
    await dismissButton.waitFor({ state: 'visible', timeout });
    await dismissButton.click();
  } catch {
    // Never appeared in the wait window - nothing to dismiss.
  }
}
