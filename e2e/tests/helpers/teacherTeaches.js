// Test-data setup/teardown for the Teacher Assignments curriculum/grade
// consistency spec — sets a teacher's `teaches[]` (Staff Subject Mapping)
// and top-level `curriculum` directly via Supabase, the same pattern as
// resetProfile.js. This is setup/teardown, never the test's own assertion
// (per this repo's E2E Persona Rule) — every test still drives the real
// Assignments UI and asserts on what's rendered/sent over the network.
//
// Snapshot/restore (not hardcoded values) so this stays safe to run
// repeatedly without permanently mutating teacher-c's real state.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function snapshotTeaches(email) {
  const { data: user, error: userError } = await supabaseAdmin
    .from('users').select('curriculum').eq('email', email).single();
  if (userError) throw new Error(`Failed to read users row for ${email}: ${userError.message}`);

  const { data: preferences, error: prefError } = await supabaseAdmin
    .from('user_preferences').select('data').eq('user_email', email).maybeSingle();
  if (prefError) throw new Error(`Failed to read user_preferences for ${email}: ${prefError.message}`);

  return { curriculum: user.curriculum, preferences: preferences ? preferences.data : null };
}

export async function restoreTeaches(email, snapshot) {
  const { error: userError } = await supabaseAdmin
    .from('users').update({ curriculum: snapshot.curriculum }).eq('email', email);
  if (userError) throw new Error(`Failed to restore users.curriculum for ${email}: ${userError.message}`);

  if (snapshot.preferences === null) {
    const { error } = await supabaseAdmin.from('user_preferences').delete().eq('user_email', email);
    if (error) throw new Error(`Failed to clear user_preferences for ${email}: ${error.message}`);
    return;
  }
  const { error } = await supabaseAdmin
    .from('user_preferences').upsert({ user_email: email, data: snapshot.preferences }, { onConflict: 'user_email' });
  if (error) throw new Error(`Failed to restore user_preferences for ${email}: ${error.message}`);
}

// Sets the teacher's users.curriculum + user_preferences.data.teaches[] to an
// exact, known configuration for one test phase.
export async function setTeacherTeaches(email, { curriculum, teaches }) {
  const { error: userError } = await supabaseAdmin
    .from('users').update({ curriculum: curriculum ?? null }).eq('email', email);
  if (userError) throw new Error(`Failed to set users.curriculum for ${email}: ${userError.message}`);

  const { data: existing } = await supabaseAdmin
    .from('user_preferences').select('data').eq('user_email', email).maybeSingle();
  const merged = { ...(existing?.data ?? {}), teaches, curriculum };
  const { error } = await supabaseAdmin
    .from('user_preferences').upsert({ user_email: email, data: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_email' });
  if (error) throw new Error(`Failed to set user_preferences.teaches for ${email}: ${error.message}`);
}
