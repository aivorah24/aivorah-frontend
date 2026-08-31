// Cleans up a student account created by the parent-onboarding "auto-create
// a child under 14" flow (see OnboardingParentBoxes.tsx's
// `/parent/children/init-auth` + `/parent/:email/children/link-created`
// calls) — used by switch-profile.spec.js after the "Also a parent?" test.
//
// Why this exists separately from resetProfile.js's generic snapshot/
// restore: that mechanism only covers the PARENT's own `users` row and
// `user_preferences` blob (restored automatically by runTeardown.js for
// every mutable account). The CHILD is a brand-new row this test itself
// creates — nothing else knows to clean it up, so without this helper every
// test run would leave one more orphaned student account behind.
//
// Same direct-Supabase-admin pattern as resetOnboarding.js/resetProfile.js:
// bypasses the app with the service role key, safe only because that key
// lives in e2e/.env and is never used in real app code.
//
// Known limitation: the real Firebase Auth user created during onboarding
// (via `createUserWithEmailAndPassword`) is NOT deleted here — this repo's
// E2E helpers have no Firebase Admin SDK access anywhere yet. The orphaned
// Firebase user is harmless (random auto-generated email, never logged into
// again, well within Firebase's free-tier user limits) but is a real,
// intentional gap — flagged here rather than silently ignored.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Deletes every child linked to this parent email whose name matches the
// given prefix (the test uses a unique-per-run name so this can never touch
// a real/other test's data). Also removes the parent_children link row.
export async function deleteCreatedChildrenByNamePrefix(parentEmail, namePrefix) {
  const { data: links, error: linksError } = await supabaseAdmin
    .from('parent_children')
    .select('child_id, users:child_id(id, name, email)')
    .eq('parent_email', parentEmail);

  if (linksError) {
    throw new Error(`Failed to read parent_children for ${parentEmail}: ${linksError.message}`);
  }

  const toDelete = (links ?? []).filter((l) => l.users?.name?.startsWith(namePrefix));

  for (const link of toDelete) {
    const { error: linkDeleteError } = await supabaseAdmin
      .from('parent_children')
      .delete()
      .eq('parent_email', parentEmail)
      .eq('child_id', link.child_id);
    if (linkDeleteError) {
      throw new Error(`Failed to delete parent_children row for child ${link.child_id}: ${linkDeleteError.message}`);
    }

    const { error: userDeleteError } = await supabaseAdmin.from('users').delete().eq('id', link.child_id);
    if (userDeleteError) {
      throw new Error(`Failed to delete child user row ${link.child_id}: ${userDeleteError.message}`);
    }
  }

  return toDelete.length;
}
