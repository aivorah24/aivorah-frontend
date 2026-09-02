import SERVER_URL from '../../../../config/serverUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import CHALLENGES_SERVER_URL from '../../../../config/challengesServerUrl';

export interface Child { id: string; name: string; grade: string; curriculum?: string; }

export interface Challenge {
  id: string;
  title: string;
  description: string;
  grade: string;
  curriculum: string;
  subject: string;
  chapterId: number;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  xpReward: number;
  questionCount: number;
  timeLimitMinutes: number;
  type: string;
  category: string;
  assignmentId?: string | null;
  status?: string;
}

// TODO(monolith removal blocked): still on the monolith, not
// STUDENTS_SERVER_URL. Root-caused 2026-09-02 - this is a DATA migration
// gap, not a code bug in aivorah-students-service:
//   - aivorah-students-service's GET /parent/:email/children route and its
//     Supabase query are correct - verified live by querying an account
//     that DOES have a row in this project (seed.parent.a@example.invalid)
//     and getting the right linked child back instantly.
//   - The real production parent_children link (and the linked user's row)
//     for actual parent accounts - e.g. e2e.parent.d@aivorah.test, which
//     returns 200 with real data from the LIVE monolith at
//     https://aivorah.ai/parent/.../children - simply does not exist yet in
//     aivorah-students-service's Supabase project. Confirmed by querying
//     parent_children directly there: 1 row total, for an unrelated seed
//     account, not this one.
//   - Repointing this call would silently break "child linked to your
//     account" for every real parent, not fix an outage - do NOT re-point
//     until parent_children (+ the linked users rows) has been migrated
//     into the microservices' Supabase project. That's a data migration,
//     not a code fix, and out of scope for a single scoped session - it
//     needs a real migration pass (with integrity checks against the
//     monolith's project) run deliberately, not silently from inside a
//     feature PR.
export async function fetchChildren(parentEmail: string): Promise<Child[]> {
  const res = await fetch(`${SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data : [];
}

export async function fetchChildStats(childId: string): Promise<any> {
  const res = await fetch(`${STUDENTS_SERVER_URL}/student/${childId}`);
  if (!res.ok) return null;
  return res.json();
}

// parentEmail is required server-side (aivorah-challenges-service verifies
// it's actually linked to child.id via parent_children before returning
// anything - added 2026-09-02, closes a previously-open gap where any
// studentId was accepted with no ownership check at all).
export async function fetchChallenges(child: Pick<Child, 'id' | 'grade' | 'curriculum'>, parentEmail: string): Promise<Challenge[]> {
  const url = `${CHALLENGES_SERVER_URL}/challenges?grade=${encodeURIComponent(child.grade)}&curriculum=${encodeURIComponent(child.curriculum || 'IB PYP')}&studentId=${child.id}&parentEmail=${encodeURIComponent(parentEmail)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function assignChallenge({
  challengeId,
  studentId,
  parentEmail,
  dueDate,
}: {
  challengeId: string;
  studentId: string;
  parentEmail: string;
  dueDate: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${CHALLENGES_SERVER_URL}/challenges/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      studentId,
      assignedById: parentEmail,
      assignedByRole: 'parent',
      dueDate,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err.error ?? 'Failed to assign. Try again.' };
  }
  return { ok: true };
}
