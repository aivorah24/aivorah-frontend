// Runs ONCE after the whole test run finishes (see playwright.config.js) -
// the LOCAL dev path. See tests/helpers/runTeardown.js for the actual work
// and why CI's sharded runs use tests/ci/teardown.mjs instead (once, after
// all shards finish, not once per shard).
//
// Skipped when PLAYWRIGHT_SKIP_GLOBAL_HOOKS=true, same reasoning as
// global-setup.js - CI's dedicated teardown job handles this once instead.

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SNAPSHOT_FILE = path.resolve(__dirname, '..', '.profile-snapshot.json');

export default async function globalTeardown() {
  if (process.env.PLAYWRIGHT_SKIP_GLOBAL_HOOKS === 'true') {
    console.log('[global-teardown] PLAYWRIGHT_SKIP_GLOBAL_HOOKS=true - skipping (CI runs tests/ci/teardown.mjs once, after all shards)');
    return;
  }

  const { runTeardown } = await import('./helpers/runTeardown.js');
  await runTeardown(SNAPSHOT_FILE);
}
