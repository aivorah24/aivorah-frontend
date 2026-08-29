// This helper resets our onboarding test account back to a "fresh" state
// before each onboarding test runs, so every test starts from the same
// known point instead of depending on what a previous test run left behind.
//
// It talks DIRECTLY to Supabase (our database) using an admin key - this
// bypasses the app entirely, the same way a developer running a SQL script
// would. This is only safe because SUPABASE_SERVICE_ROLE_KEY lives in our
// local .env file and is never committed to git or used in real app code.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Sets onboarding_complete back to false AND clears every field the
// onboarding form fills in, for the given student's email. We clear the
// fields too (not just the flag) because the real app is supposed to do the
// same thing when onboarding isn't complete - a half-reset would leave old
// answers behind and the form would load pre-filled instead of empty.
//
// The onboarding answers live in two different tables:
// - users: role/school/curriculum/grade/section/location/dob/gender/state/
//   country - plain columns. dob/gender/state/country joined this table
//   2026-08-26 (were previously ONLY in user_preferences below, which was
//   the root cause of a bug where they silently vanished on next login) -
//   they must be cleared here too or a "reset" account would still show an
//   old dob/gender/state/country left over from a previous test run.
// - user_preferences: avatarStyle/learningStyle/interests/etc - still
//   bundled inside one JSON blob per user, keyed by email. gender/dob/
//   state/country are ALSO still written here for now (old path kept
//   until the new users-table flow is fully verified) - deleting the whole
//   row below clears those too.
export async function resetOnboarding(email) {
  const { error: usersError } = await supabaseAdmin
    .from('users')
    .update({
      onboarding_complete: false,
      school: null,
      curriculum: null,
      grade: null,
      section: null,
      location: null,
      dob: null,
      gender: null,
      state: null,
      country: null,
    })
    .eq('email', email);

  if (usersError) {
    throw new Error(`Failed to reset users row for ${email}: ${usersError.message}`);
  }

  // The onboarding form's answers (dob, gender, avatar, etc.) live in this
  // row's data blob - deleting the whole row is simplest, since the app
  // should recreate it fresh once onboarding is filled in again.
  const { error: preferencesError } = await supabaseAdmin
    .from('user_preferences')
    .delete()
    .eq('user_email', email);

  if (preferencesError) {
    throw new Error(`Failed to reset user_preferences for ${email}: ${preferencesError.message}`);
  }
}
