import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';

export async function fetchWeeklyActivity(studentId: string) {
  return fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/weekly?period=week`)
    .then(r => r.json())
    .catch(() => ({ days: [] }));
}
