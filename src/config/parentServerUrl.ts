import STUDENTS_SERVER_URL from './studentsServerUrl';

// Parent / My Kids backend base URL.
//
// MIGRATED (2026-09-14): the parent/child-linkage domain (routes/parent.js)
// was ported into aivorah-students-service alongside the Teacher Students
// domain it already owned — there is no separate aivorah-parent-service.
// This was a genuine bug fix, not just cleanup: the monolith (still on
// ai-mentor/server) was pointed at a different Supabase project than the one
// real signups land in (aivorah-auth-service's), so "Link Existing" and
// "Create New" failed for real accounts with false "not found" / already-in-use
// errors. aivorah-students-service already points at the correct project.
const PARENT_SERVER_URL = STUDENTS_SERVER_URL;

export default PARENT_SERVER_URL;
