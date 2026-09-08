-- Restores the 3 B2B demo accounts' rows in public.users.
-- Root cause: these accounts exist in Firebase Auth (they authenticate fine)
-- but have no row in the users table, so /user/sync (auth-service) returns
-- {email, onboardingComplete:false} with no id/role, and AuthContext's
-- "confirmed missing in DB" guard correctly force-signs them out to Landing.
-- This is a data restoration, not a code fix — no seed script exists for
-- these accounts in aivorah-auth-service.
--
-- Modeled on the working e2e.*.a@aivorah.test rows (same TSRA school_id).
-- Run against the Supabase project this environment points at (check
-- supabase_project_canonical_mapping memory before running against Prod).

insert into public.users
  (name, email, role, grade, school, school_id, curriculum, onboarding_complete, status)
values
  ('Demo Parent',  'demo.parent@aivorah.demo',  'parent',  null,       'TSRA', 'daeb9ab7-8467-41f8-a9a2-cac3b0d58ae2', null,    true, 'active'),
  ('Demo Teacher', 'demo.teacher@aivorah.demo', 'teacher', null,       'TSRA', 'daeb9ab7-8467-41f8-a9a2-cac3b0d58ae2', null,    true, 'active'),
  ('Demo Student', 'demo.student@aivorah.demo', 'student', 'Grade 3',  'TSRA', 'daeb9ab7-8467-41f8-a9a2-cac3b0d58ae2', 'NCERT', true, 'active')
on conflict (email) do update set
  role = excluded.role,
  grade = excluded.grade,
  school = excluded.school,
  school_id = excluded.school_id,
  curriculum = excluded.curriculum,
  onboarding_complete = excluded.onboarding_complete,
  status = excluded.status;

-- Verify afterward:
-- select id, name, email, role, grade, school, curriculum, onboarding_complete
-- from public.users
-- where email in ('demo.parent@aivorah.demo','demo.teacher@aivorah.demo','demo.student@aivorah.demo');
