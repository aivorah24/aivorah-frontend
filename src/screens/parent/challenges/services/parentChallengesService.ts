import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import CHALLENGES_SERVER_URL from '../../../../config/challengesServerUrl';
import PARENT_SERVER_URL from '../../../../config/parentServerUrl';

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

export async function fetchChildren(parentEmail: string): Promise<Child[]> {
  const res = await fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
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
  challengeId, studentId, parentEmail, dueDate
}: {
  challengeId: string; studentId: string; parentEmail: string; dueDate: string;
}): Promise<{ ok: true; alreadyAssigned?: boolean } | { ok: false; error: string }> {
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
  const data = await res.json().catch(() => ({}));
  return { ok: true, alreadyAssigned: !!data.alreadyAssigned };
}
