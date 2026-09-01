// This helper puts the Profile screen's test account back exactly how it was
// before the tests ran.
//
// Why we need it: the profile tests really do save changes (school, bio,
// location, avatar, interests...). Without a reset, every run leaves the demo
// account a bit more messed up, and later runs start from a different state -
// which is exactly how tests turn flaky.
//
// How it works: we take a SNAPSHOT of the account before the tests, then write
// that snapshot back afterwards. We don't hardcode "correct" values, so this
// keeps working no matter what the demo account is set to.
//
// Like resetOnboarding.js, this talks DIRECTLY to Supabase with an admin key -
// bypassing the app, the same way a developer running a SQL script would. It's
// only safe because SUPABASE_SERVICE_ROLE_KEY lives in our local .env and is
// never committed or used in real app code.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// The profile fields that live as plain columns on the `users` table.
// (photo_url is the uploaded profile picture; the rest are the edit-popup fields.)
const USER_COLUMNS = ['name', 'school', 'curriculum', 'grade', 'location', 'photo_url'];

// Reads the account's current profile state and hands it back as a plain
// object. Everything else (bio, avatarStyle, learningStyle, interests) lives
// inside one JSON blob in user_preferences, so we grab that whole blob.
export async function snapshotProfile(email) {
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select(USER_COLUMNS.join(','))
    .eq('email', email)
    .single();

  if (userError) {
    throw new Error(`Failed to read users row for ${email}: ${userError.message}`);
  }

  // maybeSingle() instead of single() because a brand-new account might not
  // have a preferences row yet - that's not an error, it just means "nothing
  // saved". We remember that as null and restore it by deleting the row again.
  const { data: preferences, error: preferencesError } = await supabaseAdmin
    .from('user_preferences')
    .select('data')
    .eq('user_email', email)
    .maybeSingle();

  if (preferencesError) {
    throw new Error(`Failed to read user_preferences for ${email}: ${preferencesError.message}`);
  }

  return { user, preferences: preferences ? preferences.data : null };
}

// Writes a snapshot back. Call this after the tests finish.
export async function restoreProfile(email, snapshot) {
  const { error: userError } = await supabaseAdmin
    .from('users')
    .update(snapshot.user)
    .eq('email', email);

  if (userError) {
    throw new Error(`Failed to restore users row for ${email}: ${userError.message}`);
  }

  if (snapshot.preferences === null) {
    // There was no preferences row before, so remove whatever the tests made.
    const { error } = await supabaseAdmin.from('user_preferences').delete().eq('user_email', email);

    if (error) {
      throw new Error(`Failed to clear user_preferences for ${email}: ${error.message}`);
    }
    return;
  }

  // upsert = update the row if it exists, create it if the tests deleted it.
  const { error } = await supabaseAdmin
    .from('user_preferences')
    .upsert({ user_email: email, data: snapshot.preferences }, { onConflict: 'user_email' });

  if (error) {
    throw new Error(`Failed to restore user_preferences for ${email}: ${error.message}`);
  }
}
