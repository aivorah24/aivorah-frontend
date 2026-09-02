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

// TEMPORARY: on the monolith, not STUDENTS_SERVER_URL - aivorah-students-service's
// GET /parent/:email/children returns [] for every real parent account in
// production (confirmed 2026-09-01, same gap documented in
// parentAssignmentsService.ts / parentProgressService.ts). Re-point once
// that's root-caused and fixed - don't re-attempt without verifying against
// a real account first.
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

export async function fetchChallenges(child: Pick<Child, 'id' | 'grade' | 'curriculum'>): Promise<Challenge[]> {
  const url = `${CHALLENGES_SERVER_URL}/challenges?grade=${encodeURIComponent(child.grade)}&curriculum=${encodeURIComponent(child.curriculum || 'IB PYP')}&studentId=${child.id}`;
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
