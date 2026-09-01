// Runs ONCE before the whole test run starts (see playwright.config.js) -
// the LOCAL dev path, where one `playwright test` invocation does setup +
// tests + teardown itself.
//
// The actual work (warm-up + resilient parallel login + profile snapshot)
// lives in tests/helpers/runSetup.js so it can also run standalone in CI,
// once, in its own job, before sharded test jobs start - see that file's
// header comment and tests/ci/setup.mjs for why sharding needs setup
// decoupled from Playwright's per-shard globalSetup lifecycle.
//
// Skipped entirely when PLAYWRIGHT_SKIP_GLOBAL_HOOKS=true - CI's sharded
// test jobs set this because tests/ci/setup.mjs already did this work once,
// in a separate job, and handed the results (.auth/ + .profile-snapshot.json)
// to every shard via an artifact.

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default async function globalSetup(config) {
  if (process.env.PLAYWRIGHT_SKIP_GLOBAL_HOOKS === 'true') {
    console.log('[global-setup] PLAYWRIGHT_SKIP_GLOBAL_HOOKS=true - skipping (CI already ran tests/ci/setup.mjs)');
    return;
  }

  const { runSetup } = await import('./helpers/runSetup.js');
  const baseURL = config.projects[0].use.baseURL;
  await runSetup({ baseURL });
}
