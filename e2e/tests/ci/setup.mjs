// Standalone CI entry point for the "setup" job in
// .github/workflows/e2e.yml - runs warm-up + resilient parallel login +
// profile snapshot ONCE, before any sharded test job starts. See
// tests/helpers/runSetup.js's header comment for why sharding needs this
// decoupled from Playwright's own globalSetup hook.
//
// Writes .auth/ and .profile-snapshot.json to disk; the workflow uploads
// both as a single artifact for every shard job (and the teardown job) to
// download.

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runSetup } from '../helpers/runSetup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// CI supplies real env vars directly (secrets + service URLs) - this only
// picks up a local .env if one happens to exist, same as every other
// entry point in this repo.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const baseURL = process.env.BASE_URL;
if (!baseURL) {
  console.error('[ci/setup] BASE_URL is required (the deployed frontend to log in against).');
  process.exit(1);
}

const { loginFailures } = await runSetup({ baseURL });

// Unlike the Playwright-hook path, a CI setup job that couldn't log ANY
// account in at all is worth failing loudly and early, rather than letting
// every downstream shard discover it independently. A PARTIAL failure
// (some accounts, not all) still doesn't fail the job - those specs will
// fail individually in whichever shard picks them up, exactly like the
// local dev path.
const { ACCOUNTS } = await import('../helpers/accounts.js');
const totalAccounts = Object.keys(ACCOUNTS).length;
if (loginFailures.length === totalAccounts) {
  console.error('[ci/setup] Every single account failed to log in - treating this as a hard environment failure.');
  process.exit(1);
}
