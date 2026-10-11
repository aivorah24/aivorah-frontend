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
  completeChallenge,
  recordStudySeconds,
  onChallengeCompleted,
}: {
  studentId: string | undefined;
  grade: string;
  userEmail: string | undefined;
  completeChallenge: (xpAwarded?: number) => void;
  recordStudySeconds: (seconds: number, source?: "assignment" | "challenge" | "learningPath" | "other", subject?: string) => void;
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
  // flushed in seconds; the context carries sub-minute remainders.
  const sessionStartRef = useRef<number>(0);
  const trackedSecondsRef = useRef(0);

  function flushStudyTime() {
    if (!sessionStartRef.current) return;
    const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    const delta = elapsedSeconds - trackedSecondsRef.current;
    if (delta > 0) {
      recordStudySeconds(delta, 'challenge');
      trackedSecondsRef.current += delta;
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
    trackedSecondsRef.current = 0;

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
        } else {
          // Without an assignmentId, submitQuiz() can never succeed — letting the
          // student answer a whole quiz that's guaranteed to fail on Submit is
          // worse than telling them now. Close the quiz instead of silently
          // continuing (the previous behavior this bug was reported for).
          Alert.alert('Could not start challenge', 'Please try again in a moment.');
          setQuizVisible(false);
          setQuizLoading(false);
          return;
        }
      }

      // Curated challenges (e.g. the predefined NCERT Grade 1-12 set) have
      // their MCQs pre-authored and stored in aivorah-challenges-service —
      // check there first so these serve instantly with zero AI-generation
      // latency. Only challenges without predefined questions (legacy /
      // AI-generated ones) fall through to the monolith's live-generation
      // endpoint below.
      let qs: Question[] = [];
      try {
        const predefRes = await fetch(`${CHALLENGES_SERVER_URL}/challenges/${ch.id}/questions`);
        if (predefRes.ok) {
          const predefQuestions = await predefRes.json();
          if (Array.isArray(predefQuestions) && predefQuestions.length > 0) {
            qs = predefQuestions.map((q: any) => ({
              ...q,
              options: q.options ?? [],
              answer: q.options?.[q.correct] ?? '',
              type: q.questionType || 'mcq',
              acceptAnswers: q.acceptAnswers ?? null,
            }));
          }
        }
      } catch { /* fall through to live generation below */ }

      if (qs.length === 0) {
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
          qs = (Array.isArray(data.questions) ? data.questions : []).map((q: any) => ({
            ...q,
            options: q.options ?? [],
            // server returns `correct` as index (0-3); map to the option string for comparison
            answer: q.options?.[q.correct] ?? q.answer ?? '',
            type: q.type || 'mcq',
            acceptAnswers: q.acceptAnswers ?? null,
          }));
        }
      }

      if (qs.length > 0) {
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
    } catch {
      // Network/API failure while starting the challenge (assign or question
      // fetch) — previously swallowed silently, leaving the student staring at
      // a quiz modal with zero questions and no explanation.
      Alert.alert('Could not start challenge', 'Please check your connection and try again.');
      setQuizVisible(false);
    }
    setQuizLoading(false);
  }, [studentId, grade, userEmail]);

  const submitQuiz = useCallback(async () => {
    if (!activeChallenge?.assignmentId) {
      Alert.alert('Could not submit', 'This challenge could not be started properly. Please close and try again.');
      return;
    }
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
        // The challenge is complete regardless of whether any XP was
        // awarded — the "Challenges" counter must always go up here, not
        // only when xpAwarded is truthy.
        completeChallenge(data.xpAwarded || 0);
        onChallengeCompleted(activeChallenge.id, data.score, data.xpAwarded);
        // Fetch challenge leaderboard
        setLeaderLoading(true);
        try {
          const lb = await fetch(`${CHALLENGES_SERVER_URL}/challenges/leaderboard?grade=${encodeURIComponent(grade)}&limit=20`).then(r => r.json());
          const rows = lb.leaderboard ?? lb; // backward compat
          if (Array.isArray(rows)) setLeaderboard(rows);
        } catch { /* ignore */ } finally { setLeaderLoading(false); }
      } else {
        // Previously silent: the button's spinner would clear and nothing
        // would happen — no result, no error, matching "submit doesn't work".
        Alert.alert('Could not submit', 'Please try again.');
      }
    } catch {
      Alert.alert('Could not submit', 'Please check your connection and try again.');
    }
    setQuizSubmitting(false);
  }, [activeChallenge, questions, answers, studentId, grade, completeChallenge, onChallengeCompleted]);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timeLeft === 0 && !quizResult && !quizLoading && questions.length > 0) {
      // external sync (timer-driven auto-submit) — setState happens inside submitQuiz, not synchronously here
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
