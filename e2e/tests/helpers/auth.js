// Logging in through the UI takes ~9 seconds. Doing that in every test would
// cost more than 20 minutes across the whole suite - more than our entire
// 15-minute budget, before a single assertion runs.
//
// So we log in ONCE per account (in global-setup.js) and save the session to
// disk. Every test then starts already logged in, which takes about 0.3s.
// Each test still gets its own fresh, isolated browser - it just doesn't have
// to type the password again.
//
// The catch: this app logs in with Firebase, and Playwright's built-in
// storageState only saves cookies + localStorage. Firebase keeps the actual
// login token somewhere else, so saving alone isn't enough. A session here is
// three separate pieces:
//
//   1. localStorage  - saved by Playwright's storageState (a normal .json file)
//   2. IndexedDB     - the Firebase login token. Must be put back by hand.
//   3. sessionStorage- a small "logged in this session" flag. Also by hand.
//
// Miss any one of them and the app drops you back on the landing page.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where the saved sessions live. Regenerated on every run, never committed.
export const AUTH_DIR = path.resolve(__dirname, '..', '..', '.auth');

// Firebase's login token lives in this database, in this store.
const FIREBASE_DB = 'firebaseLocalStorageDb';
const FIREBASE_STORE = 'firebaseLocalStorage';

// Two files per account: the storageState Playwright understands natively,
// and the extra bits it doesn't know about.
export const statePath = (account) => path.join(AUTH_DIR, `${account}.json`);
export const extrasPath = (account) => path.join(AUTH_DIR, `${account}.extra.json`);

// Reads Firebase's login token straight out of IndexedDB.
function readFirebaseRows(page) {
  return page.evaluate(
    ([dbName, storeName]) =>
      new Promise((resolve) => {
        const open = indexedDB.open(dbName);
        open.onsuccess = () => {
          const tx = open.result.transaction(storeName, 'readonly');
          const all = tx.objectStore(storeName).getAll();
          all.onsuccess = () => resolve(all.result);
          all.onerror = () => resolve([]);
        };
        open.onerror = () => resolve([]);
      }),
    [FIREBASE_DB, FIREBASE_STORE],
  );
}

// Logs in through the real UI - the slow way - and saves everything needed to
// skip it next time. Only global-setup.js calls this.
export async function harvestSession(browser, { account, email, password, baseURL }) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto('/');
  await page.frameLocator('iframe').getByRole('button', { name: 'Login' }).click();
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByText('Sign In', { exact: true }).click();

  // Wait until we're really inside.
  //
  // We look for the "Aivorah" logo at the top of the sidebar, because that's
  // the one thing EVERY role sees. (We used to wait for "Dashboard" - but a
  // school-admin's sidebar has no Dashboard item, so admin logins sat there
  // until they timed out even though they'd signed in perfectly fine.)
  //
  // The landing page has an "Aivorah" logo too, but that one lives inside an
  // iframe, so this top-level search can't accidentally match it.
  //
  // If this times out, the plain Playwright error gives no clue WHICH of the
  // 15 accounts failed or what the screen showed. So we catch it and say both,
  // plus save a screenshot.
  try {
    await page.getByText('Aivorah', { exact: true }).first().waitFor({ timeout: 30000 });
  } catch {
    const shot = path.join(AUTH_DIR, `${account}.login-failed.png`);
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await page.screenshot({ path: shot, fullPage: true });

    // Whatever text is on screen right now is usually the answer: an error
    // message, the onboarding form, or still the login box.
    const onScreen = (
      await page
        .locator('body')
        .innerText()
        .catch(() => '')
    )
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12)
      .join(' | ');

    await context.close();
    throw new Error(
      `Login failed for ${account} (${email}) - never reached the Dashboard.\n` +
        `  On screen: ${onScreen || '(blank page)'}\n` +
        `  Screenshot: ${shot}`,
    );
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({ path: statePath(account) });

  const extras = {
    firebaseRows: await readFirebaseRows(page),
    sessionStorage: await page.evaluate(() => Object.entries(sessionStorage)),
  };
  fs.writeFileSync(extrasPath(account), JSON.stringify(extras));

  await context.close();

  if (!extras.firebaseRows.length) {
    throw new Error(`No Firebase login token captured for ${account} (${email}).`);
  }
}

// Puts the two pieces storageState can't carry back into a fresh browser.
// Call this BEFORE the first page.goto() - it runs on every page load, so the
// login token is in place before the app starts looking for it.
export async function applySession(context, account) {
  const extras = JSON.parse(fs.readFileSync(extrasPath(account), 'utf8'));

  await context.addInitScript(
    ([dbName, storeName, rows, session]) => {
      for (const [key, value] of session) sessionStorage.setItem(key, value);

      const open = indexedDB.open(dbName);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(storeName)) {
          open.result.createObjectStore(storeName, { keyPath: 'fbase_key' });
        }
      };
      open.onsuccess = () => {
        try {
          const store = open.result.transaction(storeName, 'readwrite').objectStore(storeName);
          for (const row of rows) store.put(row);
        } catch {
          // Store isn't there yet on a brand-new profile; the next load has it.
        }
      };
    },
    [FIREBASE_DB, FIREBASE_STORE, extras.firebaseRows, extras.sessionStorage],
  );
}
