import SERVER_URL from '../../../../config/serverUrl';
import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';

export async function fetchWeeklyActivity(studentId: string) {
  return fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/weekly`)
    .then(r => r.json())
    .catch(() => ({ days: [] }));
}

export async function fetchIBPYPOrCBSECurriculum(curricParam: string, grade: string) {
  const res = await fetch(`${SERVER_URL}/curriculum?curriculum=${curricParam}&grade=${encodeURIComponent(grade)}`);
  if (!res.ok) throw new Error('Failed to fetch curriculum');
  return res.json();
}

export async function fetchNCERTChapters() {
  const res = await fetch(`${SERVER_URL}/ncert/chapters`);
  if (!res.ok) throw new Error('Failed to fetch NCERT chapters');
  return res.json();
}
