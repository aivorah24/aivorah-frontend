// Standalone CI entry point for the "teardown" job in
// .github/workflows/e2e.yml - runs ONCE, after every shard job has
// finished, restoring every mutable test account from the snapshot
// tests/ci/setup.mjs took. See tests/helpers/runTeardown.js's header for
// why sharding needs this decoupled from Playwright's own globalTeardown
// hook (N shards independently restoring the same shared accounts would
// race).

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runTeardown } from '../helpers/runTeardown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const SNAPSHOT_FILE = path.resolve(__dirname, '..', '..', '.profile-snapshot.json');

await runTeardown(SNAPSHOT_FILE);
