import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import SERVER_URL from '../../../../config/serverUrl';

export interface ChildOption {
  id: string;
  name: string;
  grade: string;
}

// aivorah-students-service owns GET /parent/:email/children (ported off the
// monolith). fetchChildren here still goes through the monolith temporarily -
// see the note in parentAssignmentsService.ts / parentProgressService.ts:
// students-service's /parent/:email/children was returning [] for every real
// account in production, confirmed 2026-09-01, so all three parent features
// were reverted to SERVER_URL together. Re-point once that's fixed.
export async function fetchChildren(parentEmail: string): Promise<ChildOption[]> {
  const res = await fetch(`${SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  return Array.isArray(data) ? data.map((c: any) => ({ id: c.id, name: c.name, grade: c.grade })) : [];
}

// AI Progress Report itself now lives entirely in aivorah-students-service -
// ported off the monolith's ai-mentor/server/routes/parent.js, with the
// decommissioned Groq model (llama-3.3-70b-versatile, 404 model_not_found in
// production) replaced by openai/gpt-oss-120b.
export async function generateAIReport(parentEmail: string, childId: string): Promise<any> {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/ai-report`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate report');
  }
  return res.json();
}
