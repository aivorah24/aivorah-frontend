// The actual teardown work, factored out of tests/global-teardown.js so it
// can also run standalone in CI, once, AFTER every shard job finishes - see
// tests/helpers/runSetup.js's header for why sharding needs this decoupled
// from Playwright's per-shard lifecycle (same reasoning: restoring the same
// shared mutable accounts from N shards independently would race).

import fs from 'fs';

export async function runTeardown(snapshotFile) {
  // No snapshot file means setup never got that far - nothing to put back.
  if (!fs.existsSync(snapshotFile)) return;

  const { restoreProfile } = await import('./resetProfile.js');
  const snapshots = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));

  // Put every account back. If one fails we still try the rest - leaving
  // four accounts dirty because the fifth errored would be worse.
  const failures = [];
  for (const [key, { email, snapshot }] of Object.entries(snapshots)) {
    try {
      await restoreProfile(email, snapshot);
    } catch (error) {
      failures.push(`${key} (${email}): ${error.message}`);
    }
  }

  fs.unlinkSync(snapshotFile);

  if (failures.length) {
    throw new Error(`Could not restore these accounts:\n  ${failures.join('\n  ')}`);
  }
}
