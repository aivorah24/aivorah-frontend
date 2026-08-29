// Direct Supabase admin writes to seed/remove a parent_children row for a
// test that needs a REAL guaranteed parent-child link that doesn't already
// exist in the DB. Same pattern as seedHabitStreak.js/resetProfile.js for
// this exact class of problem.
//
// Why direct DB writes: there's no standalone public "link this existing
// parent to this existing student" endpoint in the monolith outside of the
// larger school-admin bulk-create / student-onboarding flows, which would be
// far more invasive to drive for a single test fixture than one Postgres row.
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function linkParentToChild(parentEmail, childId) {
  const { error } = await supabaseAdmin
    .from('parent_children')
    .upsert({ parent_email: parentEmail, child_id: childId }, { onConflict: 'parent_email,child_id' });
  if (error) throw new Error(`linkParentToChild failed: ${error.message}`);
}

export async function unlinkParentFromChild(parentEmail, childId) {
  await supabaseAdmin.from('parent_children').delete().eq('parent_email', parentEmail).eq('child_id', childId);
}
