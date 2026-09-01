import SERVER_URL from '../../../../config/serverUrl';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import AUTH_SERVER_URL from '../../../../config/authServerUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import { WEEK_DAYS } from '../constants';

export async function syncUser(email: string): Promise<{ phone?: string; location?: string } | null> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function saveProfile(payload: { email: string; name: string; location: string; phone: string; role: string }) {
  return fetch(`${PROFILE_SERVER_URL}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Aggregates this parent's children + sums their weekly study minutes.
// This is an aggregation across the Children and Student domains, not
// profile-owned data, so it stays here rather than in the profile service.
// aivorah-students-service now owns GET /parent/:email/children (ported off
// the monolith) - /student/:id/weekly below is unrelated and stays on SERVER_URL.
export async function fetchChildrenActivity(parentEmail: string): Promise<{ children: any[]; weeklyActivity: number[] }> {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  if (!Array.isArray(data)) return { children: [], weeklyActivity: [0, 0, 0, 0, 0, 0, 0] };

  let weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
  if (data.length > 0) {
    const results = await Promise.all(
      data.map((c: any) =>
        fetch(`${SERVER_URL}/student/${c.id}/weekly`)
          .then(r => r.json())
          .catch(() => ({ days: [] }))
      )
    );
    const combined = [0, 0, 0, 0, 0, 0, 0];
    results.forEach((res: any) => {
      if (res?.days) {
        const actMap: Record<string, number> = {};
        res.days.forEach((d: any) => { actMap[d.day] = d.studyMinutes ?? 0; });
        WEEK_DAYS.forEach((d, i) => { combined[i] += actMap[d] ?? 0; });
      }
    });
    weeklyActivity = combined;
  }
  return { children: data, weeklyActivity };
}
