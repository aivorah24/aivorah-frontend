// Gives a test a browser tab that's ALREADY logged in as a given account.
//
// global-setup.js logged every account in once and saved the session to .auth/.
// This picks up that saved session so a test doesn't have to type a password -
// about 0.3s instead of ~9s, per test.
//
// Each test still gets its own separate browser context, so tests stay fully
// isolated from each other. Playwright closes contexts made from the `browser`
// fixture automatically when the test ends, so there's nothing to clean up.

import { statePath, applySession } from './auth.js';

export async function newPageAs(browser, account) {
  const context = await browser.newContext({ storageState: statePath(account) });

  // The Firebase login token can't travel in storageState, so it gets put back
  // by hand - and it has to happen BEFORE the first page load.
  await applySession(context, account);

  return context.newPage();
}
