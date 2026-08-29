// The actual setup work (warm-up + login + profile snapshot), factored out
// of tests/global-setup.js so it can run two ways:
//
//   1. As a Playwright globalSetup hook (tests/global-setup.js) - the local
//      dev path, one `playwright test` invocation does setup + tests +
//      teardown itself.
//
//   2. As a standalone CI script (tests/ci/setup.mjs), run ONCE in its own
//      job before any sharded test job starts. Sharding runs the suite as
//      N separate `playwright test --shard=X/N` processes (see
//      .github/workflows/e2e.yml) - each one has its OWN globalSetup
//      lifecycle, so letting Playwright's hook do login again in every
//      shard would mean N redundant logins for the same 60+ accounts, and
//      worse, N shards independently snapshotting/restoring the SAME shared
//      mutable accounts (a real race, not just waste). Running it once in a
//      dedicated job and handing the results to every shard via an
//      artifact (.auth/ + .profile-snapshot.json) avoids both problems.
//
// Same warm-up + bounded-concurrency + retry/backoff behavior either way -
// see tests/helpers/warmup.js and tests/global-setup.js's git history for
// why (the 2026-08-26 student-d9/student-d10 investigation).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SNAPSHOT_FILE = path.resolve(__dirname, '..', '..', '.profile-snapshot.json');

// See tests/global-setup.js's original comments (git history) for the full
// reasoning behind these two concurrency knobs and why they differ.
const LOGIN_CONCURRENCY = Number(process.env.LOGIN_CONCURRENCY) || 4;
const SNAPSHOT_CONCURRENCY = Number(process.env.SNAPSHOT_CONCURRENCY) || 10;
const LOGIN_MAX_ATTEMPTS = 3;
const LOGIN_BACKOFF_MS = [0, 4000, 10000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSetup({ baseURL }) {
  const { snapshotProfile } = await import('./resetProfile.js');
  const { harvestSession, AUTH_DIR } = await import('./auth.js');
  const { ACCOUNTS, PASSWORD, accountFor } = await import('./accounts.js');
  const { runWithConcurrency } = await import('./concurrencyPool.js');
  const { warmupServices } = await import('./warmup.js');

  // Start clean - a stale session from an earlier run would silently log a
  // test in as the wrong account.
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });

  // ── 0. Warm up every backend + the frontend, in parallel ──────────────
  const warmupStart = Date.now();
  const { results: warmupResults, slow, failed: warmupFailed } = await warmupServices(baseURL);
  const warmupMs = Date.now() - warmupStart;

  console.log(`[setup] warm-up: ${warmupResults.length} targets in ${Math.round(warmupMs / 1000)}s`);
  if (slow.length) {
    console.log(
      `[setup] warm-up: ${slow.length} target(s) needed a retry (likely cold start): ` +
        slow.map((r) => `${r.name} (${r.attempts} attempts, ${Math.round(r.ms / 1000)}s)`).join(', '),
    );
  }
  if (warmupFailed.length) {
    console.warn(
      `[setup] warm-up: ${warmupFailed.length} target(s) never responded: ` +
        warmupFailed.map((r) => `${r.name} (${r.error})`).join(', '),
    );
  }

  // ── 1. Log in every account, bounded-concurrency + retry/backoff ──────
  const keys = Object.keys(ACCOUNTS);
  const browser = await chromium.launch();
  const loginStart = Date.now();

  async function loginWithRetry(key) {
    let lastErr;
    for (let attempt = 0; attempt < LOGIN_MAX_ATTEMPTS; attempt++) {
      if (LOGIN_BACKOFF_MS[attempt]) await sleep(LOGIN_BACKOFF_MS[attempt]);
      try {
        await harvestSession(browser, {
          account: key,
          email: accountFor(key).email,
          password: PASSWORD,
          baseURL,
        });
        return { key, attempts: attempt + 1 };
      } catch (err) {
        lastErr = err;
      }
    }
    throw new Error(`${key} -> ${lastErr.message} (gave up after ${LOGIN_MAX_ATTEMPTS} attempts)`);
  }

  let loginResults;
  try {
    loginResults = await runWithConcurrency(keys, LOGIN_CONCURRENCY, loginWithRetry);
  } finally {
    await browser.close();
  }
  const loginMs = Date.now() - loginStart;

  const loginFailures = loginResults
    .map((r, i) => (r.status === 'rejected' ? `${keys[i]}: ${r.reason.message}` : null))
    .filter(Boolean);
  const retried = loginResults.filter((r) => r.status === 'fulfilled' && r.value.attempts > 1);

  console.log(
    `[setup] login: ${keys.length} accounts in ${Math.round(loginMs / 1000)}s ` +
      `(concurrency ${LOGIN_CONCURRENCY}, ${retried.length} needed a retry, ${loginFailures.length} failed)`,
  );

  // Do NOT abort over accounts that still failed after retries - a missing
  // .auth/<account>.json produces a clear, scoped Playwright error only in
  // the specs that use it, not a suite-wide abort. Still surfaced loudly.
  if (loginFailures.length) {
    console.error(
      `[setup] ${loginFailures.length} account(s) could not log in after retries - ` +
        `specs using them will fail individually, the rest of the suite will still run:\n  ` +
        loginFailures.join('\n  '),
    );
  }

  // ── 2. Snapshot mutable accounts, bounded-concurrency ──────────────────
  const mutable = Object.entries(ACCOUNTS).filter(([, a]) => a.mutable);
  const snapshotStart = Date.now();

  const snapshotResults = await runWithConcurrency(
    mutable,
    SNAPSHOT_CONCURRENCY,
    async ([key, account]) => ({
      key,
      email: account.email,
      snapshot: await snapshotProfile(account.email),
    }),
  );
  const snapshotMs = Date.now() - snapshotStart;

  const snapshots = {};
  const snapshotFailures = [];
  snapshotResults.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      snapshots[r.value.key] = { email: r.value.email, snapshot: r.value.snapshot };
    } else {
      snapshotFailures.push(`${mutable[i][0]}: ${r.reason.message}`);
    }
  });

  console.log(
    `[setup] profile snapshot: ${mutable.length} accounts in ${Math.round(snapshotMs / 1000)}s ` +
      `(concurrency ${SNAPSHOT_CONCURRENCY}, ${snapshotFailures.length} failed)`,
  );
  if (snapshotFailures.length) {
    console.error(
      `[setup] ${snapshotFailures.length} account(s) could not be snapshotted - ` +
        `teardown won't be able to restore them:\n  ` + snapshotFailures.join('\n  '),
    );
  }

  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshots, null, 2));

  console.log(
    `[setup] total: ${Math.round((warmupMs + loginMs + snapshotMs) / 1000)}s ` +
      `(warm-up ${Math.round(warmupMs / 1000)}s + login ${Math.round(loginMs / 1000)}s + snapshot ${Math.round(snapshotMs / 1000)}s)`,
  );

  return { warmupMs, loginMs, snapshotMs, loginFailures, snapshotFailures };
}
