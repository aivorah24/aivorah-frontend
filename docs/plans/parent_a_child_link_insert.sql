-- Restores parent-a's (e2e.parent.a@aivorah.test) missing child link.
-- Root cause: GET /parent/:email/children (aivorah-students-service) reads
-- from public.parent_children, joined on child_id -> users.id. Confirmed
-- live: https://aivorah-students-service.onrender.com/parent/e2e.parent.a%40aivorah.test/children
-- currently returns [] - no row exists for this parent, so the frontend's
-- selectedChild.id is empty and both AIWeeklyInsightCard and the "View
-- Detailed Report" button correctly render nothing (if (!child.id) return
-- null) - not a frontend bug, a missing link row.
--
-- Links to student-a (e2e.student.a@aivorah.test), the same shared
-- read-only student account already linked to parent-e and parent-i per
-- tests/helpers/accounts.js's own comments - safe to add a third read-only
-- link, nothing mutates this child.

insert into public.parent_children (parent_email, child_id)
values ('e2e.parent.a@aivorah.test', '9aeae586-ebe0-4569-93f0-aac0d8db3bb0')
on conflict (parent_email, child_id) do nothing;

-- Verify afterward:
-- select pc.parent_email, pc.child_id, u.name, u.email
-- from public.parent_children pc
-- join public.users u on u.id = pc.child_id
-- where pc.parent_email = 'e2e.parent.a@aivorah.test';
