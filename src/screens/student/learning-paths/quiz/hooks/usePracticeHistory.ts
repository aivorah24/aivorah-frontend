import { useCallback, useEffect, useRef, useState } from 'react';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';
import { fetchTopicAttempts, PastAttempt } from '../resultCache';

// The topic's past practice tests (newest first) for the Practice start page
// and the History list. reload() after a test so the new one shows up.
export function usePracticeHistory(studentId: string | undefined, subject: string, topic: string) {
  const [attempts, setAttempts] = useState<PastAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true); setError('');
    try {
      const list = await fetchTopicAttempts(studentId, subject, topic);
      if (mine === seq.current) setAttempts(list);
    } catch (e: any) {
      if (mine === seq.current) setError(e?.message || 'Could not load your past tests');
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [studentId, subject, topic]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount / when the topic changes
  useEffect(() => { reload(); }, [reload]);

  // The next test's number: one after the highest so far.
  const nextAttemptNumber = attempts.reduce((n, a) => Math.max(n, a.attemptNumber || 0), 0) + 1;

  return { attempts, loading, error, reload, nextAttemptNumber };
}

// Aivorah's explanation for each wrong answer of a past test (they are not
// stored with the attempt), fetched once per test like the live report does.
const explanationCache = new Map<string, Record<number, string>>();

export function useAttemptExplanations(attempt: PastAttempt | null, params: { topic: string; subject: string; grade: string }) {
  const { topic, subject, grade } = params;
  const [explanations, setExplanations] = useState<Record<number, string>>(() => (attempt && explanationCache.get(attempt.id)) || {});

  useEffect(() => {
    if (!attempt) return;
    const cached = explanationCache.get(attempt.id) || {};
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show what is already known for this test right away
    setExplanations({ ...cached });
    let alive = true;
    attempt.questions.forEach((q, i) => {
      if (!q || q.isCorrect || q.type === 'spoken' || cached[i]) return;
      fetch(`${LEARNING_PATHS_SERVER_URL}/ibpyp/explain-wrong`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, grade, question: q.question, wrongAnswer: q.studentAnswer || '(no answer)', correctAnswer: q.correctAnswer }),
      })
        .then((r) => r.json())
        .then((d) => d?.explanation || 'The correct answer is shown above.')
        .catch(() => 'The correct answer is shown above.')
        .then((text) => {
          const store = explanationCache.get(attempt.id) || {};
          store[i] = text;
          explanationCache.set(attempt.id, store);
          if (alive) setExplanations((prev) => ({ ...prev, [i]: text }));
        });
    });
    return () => { alive = false; };
  }, [attempt, topic, subject, grade]);

  return explanations;
}
