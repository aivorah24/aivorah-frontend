// Direct Supabase admin writes for seeding a habit streak - same pattern
// resetProfile.js already uses for this exact class of problem (setup that
// no real app endpoint can perform).
//
// Why direct DB writes are the ONLY option here: POST /habits/checkin
// (routes/habits.js) hardcodes `date: todayStr()` on every insert - there is
// no API path anywhere in the app that can ever create a habits_checkins
// row for a date other than today. Testing the streak-milestone business
// rule (every 10th day shows a banner) requires a real multi-day history,
// which is structurally impossible to build through the UI/API alone.
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Backdates `daysBack` consecutive days of real habits_checkins rows ending
// yesterday (today's own row is still created for real, through the actual
// UI checkin click - this only seeds the PRECEDING days). Reuses one real
// habitId for every row - computeStreak() (routes/habits.js) only groups
// DISTINCT dates for the user, never validating habit_id against a real
// parent_daily_tasks row for the streak calculation, so this can't
// interfere with "today's" own completed-habit state (that's scoped by
// date AND habit_id together, not by date alone).
export async function seedBackdatedCheckins(userEmail, habitId, daysBack) {
  const email = userEmail.toLowerCase().trim();
  const rows = [];
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    rows.push({ user_email: email, habit_id: habitId, date: d.toISOString().slice(0, 10) });
  }
  const { error } = await supabaseAdmin.from('habits_checkins').insert(rows);
  if (error) throw new Error(`seedBackdatedCheckins failed: ${error.message}`);
}

// Deletes EVERY habits_checkins row for this (user, habit) pair - including
// today's real one, not just the backdated rows. DELETE /habits/parent-
// tasks/:taskId (routes/habits.js) does NOT cascade-delete habits_checkins
// rows when a task is removed, so without this a "today" row would be left
// orphaned forever and silently inflate a future run's streak if re-run
// within the same ~9-day window. Safe to scope by habitId alone since each
// test creates a fresh UUID task - no risk of deleting another test's rows.
export async function clearHabitCheckins(userEmail, habitId) {
  const email = userEmail.toLowerCase().trim();
  const { error } = await supabaseAdmin
    .from('habits_checkins')
    .delete()
    .eq('user_email', email)
    .eq('habit_id', habitId);
  if (error) throw new Error(`clearHabitCheckins failed: ${error.message}`);
}
