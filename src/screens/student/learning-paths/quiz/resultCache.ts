import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';

// Last finished practice result per topic, so reopening Practice shows it
// (Try Again starts a new test). Memory first; the server's latest attempt after a reload.
export interface SavedQuizResult {
  questions: { question: string }[];
  perQuestionResults: any[];
  score: number;
  attemptNumber: number;
  timeSpentSeconds: number;
  explanations: Record<number, string>;
}

const cache = new Map<string, SavedQuizResult>();
const key = (studentId: string | undefined, subject: string, topic: string) => `${studentId ?? ''}::${subject}::${topic}`;

export function saveQuizResult(studentId: string | undefined, subject: string, topic: string, r: SavedQuizResult) {
  cache.set(key(studentId, subject, topic), r);
}

export function clearQuizResults() {
  cache.clear();
}

export async function loadQuizResult(studentId: string | undefined, subject: string, topic: string): Promise<SavedQuizResult | null> {
  const hit = cache.get(key(studentId, subject, topic));
  if (hit) return hit;
  if (!studentId) return null;
  try {
    const res = await fetch(`${LEADERBOARD_SERVICE_URL}/student/${encodeURIComponent(studentId)}/attempts?subject=${encodeURIComponent(subject)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const latest = (Array.isArray(data?.attempts) ? data.attempts : [])
      .find((a: any) => a.topic === topic && Array.isArray(a.questions) && a.questions.length > 0);
    if (!latest) return null;
    const saved: SavedQuizResult = {
      questions: latest.questions.map((q: any) => ({ question: q.question })),
      perQuestionResults: latest.questions,
      score: latest.questions.filter((q: any) => q.isCorrect).length,
      attemptNumber: latest.attemptNumber || 1,
      timeSpentSeconds: latest.timeSpentSeconds || 0,
      explanations: {},
    };
    cache.set(key(studentId, subject, topic), saved);
    return saved;
  } catch {
    return null;
  }
}
