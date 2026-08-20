import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import SERVER_URL from '../../../../config/serverUrl';
import CHALLENGES_SERVER_URL from '../../../../config/challengesServerUrl';
import type { Challenge, Question } from '../types';
import { isQuestionCorrect } from '../utils/quizScoring';

export function useQuizSession({
  studentId,
  grade,
  userEmail,
  addXP,
  recordStudyTime,
  onChallengeCompleted,
}: {
  studentId: string | undefined;
  grade: string;
  userEmail: string | undefined;
  addXP: (xp: number) => void;
  recordStudyTime: (minutes: number, source?: 'learningPath' | 'assignment' | 'challenge' | 'other', subject?: string) => void;
  onChallengeCompleted: (challengeId: string, score: number, xpAwarded: number) => void;
}) {
  const [quizVisible, setQuizVisible] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; xpAwarded: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderLoading, setLeaderLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Time actually spent attempting a challenge quiz — counted as real "Study Time",
  // same pattern as TopicLessonScreen (flush whole minutes, not "screen was open").
  const sessionStartRef = useRef<number>(0);
  const trackedMinutesRef = useRef(0);

  function flushStudyTime() {
    if (!sessionStartRef.current) return;
    const elapsedWholeMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000);
    const delta = elapsedWholeMinutes - trackedMinutesRef.current;
    if (delta > 0) {
      recordStudyTime(delta, 'challenge');
      trackedMinutesRef.current += delta;
    }
  }

  const startChallenge = useCallback(async (ch: Challenge) => {
    if ((ch as any).closed && ch.status !== 'completed') {
      Alert.alert('Challenge Closed', 'This challenge closed on its due date and no longer accepts submissions.');
      return;
    }
    setActiveChallenge(ch);
    setQuizResult(null);
    setAnswers([]);
    setQuizLoading(true);
    setQuizVisible(true);
    sessionStartRef.current = Date.now();
    trackedMinutesRef.current = 0;

    try {
      // Auto-assign if not yet assigned
      let assignmentId = ch.assignmentId;
      if (!assignmentId && studentId) {
        const assignRes = await fetch(`${CHALLENGES_SERVER_URL}/challenges/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: ch.id,
            studentId,
            assignedById: userEmail,
            assignedByRole: 'student',
          }),
        });
        if (assignRes.ok) {
          const asgn = await assignRes.json();
          assignmentId = asgn.id;
          setActiveChallenge(prev => prev ? { ...prev, assignmentId: asgn.id } : prev);
        }
      }

      // Fetch quiz questions
      const qRes = await fetch(`${SERVER_URL}/ncert/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: ch.topic,
          count: ch.questionCount,
          grade: ch.grade || grade,
          subject: ch.subject || 'Mathematics',
          difficulty: ch.difficulty || 'Easy',
          challengeType: ch.type || '',
          challengeId: ch.id || '',
        }),
      });
      if (qRes.ok) {
        const data = await qRes.json();
        const qs: Question[] = (Array.isArray(data.questions) ? data.questions : []).map((q: any) => ({
          ...q,
          options: q.options ?? [],
          // server returns `correct` as index (0-3); map to the option string for comparison
          answer: q.options?.[q.correct] ?? q.answer ?? '',
          type: q.type || 'mcq',
          acceptAnswers: q.acceptAnswers ?? null,
        }));
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(null));
        // Start countdown timer
        if (ch.timeLimitMinutes && ch.timeLimitMinutes > 0) {
          const secs = ch.timeLimitMinutes * 60;
          setTimeLeft(secs);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(timerRef.current!);
                timerRef.current = null;
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch {}
    setQuizLoading(false);
  }, [studentId, grade, userEmail]);

  const submitQuiz = useCallback(async () => {
    if (!activeChallenge?.assignmentId) return;
    const correct = questions.filter((q, i) => isQuestionCorrect(q, answers[i])).length;
    const score = Math.round((correct / questions.length) * 100);
    setQuizSubmitting(true);
    try {
      const res = await fetch(`${CHALLENGES_SERVER_URL}/challenges/${activeChallenge.assignmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, score }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuizResult({ score: data.score, xpAwarded: data.xpAwarded });
        if (data.xpAwarded) addXP(data.xpAwarded);
        onChallengeCompleted(activeChallenge.id, data.score, data.xpAwarded);
        // Fetch challenge leaderboard
        setLeaderLoading(true);
        try {
          const lb = await fetch(`${CHALLENGES_SERVER_URL}/challenges/leaderboard?grade=${encodeURIComponent(grade)}&limit=20`).then(r => r.json());
          const rows = lb.leaderboard ?? lb; // backward compat
          if (Array.isArray(rows)) setLeaderboard(rows);
        } catch { /* ignore */ } finally { setLeaderLoading(false); }
      }
    } catch {}
    setQuizSubmitting(false);
  }, [activeChallenge, questions, answers, studentId, grade, addXP, onChallengeCompleted]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timeLeft === 0 && !quizResult && !quizLoading && questions.length > 0) {
      submitQuiz();
    }
  }, [timeLeft]);

  // Cleanup timer on unmount or quiz close
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const closeQuiz = useCallback(() => {
    flushStudyTime();
    sessionStartRef.current = 0;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(null);
    setQuizVisible(false);
    setActiveChallenge(null);
    setQuestions([]);
    setAnswers([]);
    setQuizResult(null);
  }, []);

  // Flush on submit too (closeQuiz isn't always called right after — the result
  // screen can stay open a while before the student dismisses it).
  useEffect(() => {
    if (quizResult) flushStudyTime();
  }, [quizResult]);

  // Safety net: flush if the component unmounts while a challenge is still active
  // (e.g. student navigates away without tapping close).
  useEffect(() => () => flushStudyTime(), []);

  const allAnswered = answers.length > 0 && answers.every(a => a !== null && a.trim().length > 0);

  return {
    quizVisible, activeChallenge, questions, answers, setAnswers,
    quizLoading, quizSubmitting, quizResult, timeLeft,
    leaderboard, leaderLoading, allAnswered,
    startChallenge, submitQuiz, closeQuiz,
  };
}
