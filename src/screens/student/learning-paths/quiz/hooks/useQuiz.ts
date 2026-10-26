import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import ASSIGNMENTS_SERVER_URL from '../../../../../config/assignmentsServerUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';
import LEADERBOARD_SERVICE_URL from '../../../../../config/leaderboardServiceUrl';
import { computeCappedQuizSeconds } from '../../../../../services/studyTime';
import { normalizeQuizQuestions, playSound } from '../utils';
import type { Question, QuizPhase } from '../types';
import { loadQuizResult, saveQuizResult } from '../resultCache';

export function useQuiz(params: {
  topic: string; grade: string; subject: string; curriculum: string;
  passageText?: string; topicId?: string;
  // Teacher-authored practice questions (Phase 2/4) — when present, skip
  // /ibpyp/quiz generation and use these directly.
  practiceQuiz?: any[];
  userEmail?: string; userRole?: string; studentId?: string;
  navigation: any;
  completeLesson: (topic: string, subject: string, grade: string, curriculum: string) => void;
  addXP: (xp: number) => void;
  recordStudySeconds: (seconds: number, source?: "assignment" | "challenge" | "learningPath" | "other", subject?: string) => void;
  // Optional so existing callers/tests keep working — see StudentDataContext.
  recordQuizResult?: (topic: string, score: number, subject?: string) => void;
}) {
  const { topic, grade, subject, curriculum, passageText, topicId, practiceQuiz, userEmail, userRole, studentId, navigation, completeLesson, addXP, recordStudySeconds, recordQuizResult } = params;

  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);

  // MCQ state
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [mcqAttempts, setMcqAttempts] = useState(0); // attempts on current MCQ
  const [showMcqHint, setShowMcqHint] = useState(false);
  const [mcqDone, setMcqDone] = useState(false); // locked after 2nd wrong

  // Fill-blank state
  const [fillInput, setFillInput] = useState('');
  const [fillAttempts, setFillAttempts] = useState(0);
  const [fillFeedback, setFillFeedback] = useState<'idle' | 'wrong1' | 'wrong2' | 'revealed' | 'correct'>('idle');
  const [fillValidating, setFillValidating] = useState(false);

  // Explanation
  const [explanation, setExplanation] = useState('');
  const [loadingExplain, setLoadingExplain] = useState(false);

  // Issue #121 — attempt tracking, time tracking, per-question results
  const [attemptNumber, setAttemptNumber] = useState(1);
  const perQuestionResultsRef = useRef<any[]>([]);
  const explanationsRef = useRef<Record<number, string>>({});
  const [initialStartTime] = useState(() => Date.now());
  const quizStartTimeRef = useRef(initialStartTime);
  const questionStartTimeRef = useRef(initialStartTime);

  // Issue #106 — auto-loaded explanations in result screen
  const [resultExplanations, setResultExplanations] = useState<Record<number, string>>({});

  const scoreRef = useRef(score);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Auto-fetch explanations for all wrong answers when results load
  useEffect(() => {
    if (phase !== 'result') return;
    perQuestionResultsRef.current.forEach((r, i) => {
      if (r.isCorrect) return;
      if (explanationsRef.current[i]) return; // already have it
      fetch(`${LEARNING_PATHS_SERVER_URL}/ibpyp/explain-wrong`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, grade, question: r.question, wrongAnswer: r.studentAnswer, correctAnswer: r.correctAnswer }),
      })
        .then(res => res.json())
        .then(data => {
          const text = data.explanation || 'The correct answer is shown above.';
          explanationsRef.current[i] = text;
          setResultExplanations(prev => ({ ...prev, [i]: text }));
        })
        .catch(() => {
          setResultExplanations(prev => ({ ...prev, [i]: 'The correct answer is shown above.' }));
        });
    });
  }, [phase]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (phase !== 'quiz') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Leave Quiz?', 'Your progress will be lost.',
        [{ text: 'Stay', style: 'cancel' }, { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() }]);
      return true;
    });
    return () => handler.remove();
  }, [phase]);

  function resetQuestionState() {
    setMcqSelected(null); setMcqAttempts(0); setShowMcqHint(false); setMcqDone(false);
    setFillInput(''); setFillAttempts(0); setFillFeedback('idle'); setFillValidating(false);
    setExplanation(''); setLoadingExplain(false);
  }

  const fetchQuiz = useCallback(async (isRetake = false) => {
    setPhase('loading');
    setScore(0); setCurrentQ(0);
    resetQuestionState();
    perQuestionResultsRef.current = [];
    explanationsRef.current = {};
    setResultExplanations({});
    quizStartTimeRef.current = Date.now();
    questionStartTimeRef.current = Date.now();
    if (isRetake) setAttemptNumber(n => n + 1);
    if (practiceQuiz?.length) {
      setQuestions(normalizeQuizQuestions(practiceQuiz));
      setPhase('quiz');
      return;
    }
    try {
      const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/ibpyp/quiz`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, grade, subject, curriculum, passageText, topicId, userEmail, role: userRole }),
      });
      const data = await res.json();
      if (!data.questions?.length) throw new Error('No questions');
      setQuestions(normalizeQuizQuestions(data.questions));
      setPhase('quiz');
    } catch {
      Alert.alert('Error', 'Could not generate quiz. Please try again.');
      navigation.goBack();
    }
  }, [topic, grade, subject, curriculum, passageText, userEmail, practiceQuiz]);

  // Reopening Practice for a topic already tried shows its last result; otherwise a new test.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadQuizResult(studentId, subject, topic);
      if (cancelled) return;
      if (!saved) { fetchQuiz(); return; }
      perQuestionResultsRef.current = saved.perQuestionResults;
      explanationsRef.current = saved.explanations;
      setResultExplanations({ ...saved.explanations });
      quizStartTimeRef.current = Date.now() - saved.timeSpentSeconds * 1000;
      setQuestions(saved.questions as Question[]);
      setAttemptNumber(saved.attemptNumber);
      setScore(saved.score);
      setPhase('result');
    })();
    return () => { cancelled = true; };
  }, [fetchQuiz]);

  function finishQuiz(finalScore: number) {
    const pct = Math.round((finalScore / questions.length) * 100);
    const totalTimeSeconds = Math.round((Date.now() - quizStartTimeRef.current) / 1000);

    // Legacy analytics
    fetch(`${LEARNING_PATHS_SERVER_URL}/ibpyp/track-result`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, role: userRole, topic, subject, grade, score: pct, totalQuestions: questions.length, correctAnswers: finalScore, firstAttemptCorrect: finalScore, attemptNumber, perQuestionAttempts: [] }),
    }).catch(() => {});

    // Local copy of the result, so the dashboard shows it the moment the
    // student returns even if the fire-and-forget track-result write below
    // hasn't reached GET /performance yet.
    recordQuizResult?.(topic, pct, subject);

    // Issue #121 — detailed attempt tracking
    if (studentId) {
      fetch(`${LEADERBOARD_SERVICE_URL}/student/track-attempt`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          topic, subject, grade, curriculum,
          totalQuestions: questions.length,
          correctAnswers: finalScore,
          score: pct,
          timeSpentSeconds: totalTimeSeconds,
          perQuestionResults: perQuestionResultsRef.current,
          attemptNumber,
        }),
      }).catch(() => {});
    } else if (__DEV__) {
      // B004: this should be unreachable once logged in (studentId resolves
      // before a quiz is reachable) — if it fires, tracking was silently
      // skipped, same failure mode as the original bug. Surface it instead
      // of swallowing it quietly.
      console.warn('[useQuiz] track-attempt skipped: no studentId resolved yet');
    }

    // Bug #22 ("XP inconsistent between pages"): this used to ALSO call
    // addXP(pct>=80?100:pct>=60?60:30) here — a separate, purely local-only
    // XP bump never sent to any server, on top of completeLesson()'s real,
    // server-persisted, idempotent flat-150 award. That meant: a first
    // pass showed 150+60/100 XP but only 150 was ever persisted (the extra
    // vanished on any refetch); a REPEAT pass of an already-done topic kept
    // adding local XP every single retry with no idempotency; and a failing
    // attempt (pct<60, completeLesson not even called) showed +30 XP that
    // was 100% fake. completeLesson() is now the only XP source for this
    // event, so what's shown always matches what a fresh page load shows.
    if (pct >= 60) completeLesson(topic, subject, grade, curriculum);

    // Quiz time is real learning time too — a student who skips straight to the
    // quiz (no lesson-reading session beforehand) was getting 0 study time
    // recorded even though they spent real minutes on it. Use the SUM of
    // per-question times (each capped), not raw quiz-start-to-now wall-clock
    // time — a question left open/backgrounded for hours must not leak that
    // idle gap into recorded study time.
    recordStudySeconds(computeCappedQuizSeconds(perQuestionResultsRef.current), 'learningPath', subject);

    // Sound effect based on score tier
    playSound(pct >= 80 ? 'gold' : pct >= 60 ? 'silver' : 'bronze');

    saveQuizResult(studentId, subject, topic, {
      questions, perQuestionResults: perQuestionResultsRef.current, score: finalScore,
      attemptNumber, timeSpentSeconds: totalTimeSeconds, explanations: explanationsRef.current,
    });

    setScore(finalScore);
    setPhase('result');
  }

  function goNext(isCorrect: boolean) {
    const q = questions[currentQ];
    const qTimeSeconds = Math.round((Date.now() - questionStartTimeRef.current) / 1000);

    // Record per-question result
    const studentAnswer = q.type === 'fill_blank'
      ? fillInput.trim()
      : (mcqSelected != null ? q.options[mcqSelected] : '');
    const correctAnswer = q.type === 'fill_blank'
      ? String(q.correct)
      : q.options[q.correct as number];
    perQuestionResultsRef.current.push({
      question: q.question,
      studentAnswer,
      correctAnswer,
      isCorrect,
      timeSeconds: qTimeSeconds,
    });

    const newScore = scoreRef.current + (isCorrect ? 1 : 0);
    scoreRef.current = newScore;
    setScore(newScore);
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      resetQuestionState();
      questionStartTimeRef.current = Date.now();
    } else {
      finishQuiz(newScore);
    }
  }

  // Go back to a previously-answered question and restore it in review mode
  // (their recorded answer shown, locked — no re-scoring).
  function goPrev() {
    if (currentQ === 0) return;
    const prevIdx = currentQ - 1;
    const rec = perQuestionResultsRef.current[prevIdx];
    setCurrentQ(prevIdx);
    resetQuestionState();
    if (!rec) return;
    const q = questions[prevIdx];
    // Restore the locked answer so the review shows what the student chose.
    if (q.type === 'fill_blank') {
      setFillInput(rec.studentAnswer || '');
      setFillFeedback(rec.isCorrect ? 'correct' : 'revealed');
    } else {
      const idx = q.options.findIndex((o: string) => o === rec.studentAnswer);
      setMcqSelected(idx >= 0 ? idx : null);
      setMcqDone(true);
    }
    setExplanation(explanationsRef.current[prevIdx] || q.explanation || '');
    questionStartTimeRef.current = Date.now();
  }

  async function fetchExplanation(q: Question, wrong: string, correct: string, wasCorrect: boolean) {
    if (wasCorrect) {
      const text = q.explanation || 'Great job! That\'s correct!';
      setExplanation(text);
      explanationsRef.current[currentQ] = text;
      setResultExplanations(prev => ({ ...prev, [currentQ]: text }));
      return;
    }
    setLoadingExplain(true);
    try {
      const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/ibpyp/explain-wrong`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, grade, question: q.question, wrongAnswer: wrong, correctAnswer: correct }),
      });
      const data = await res.json();
      const text = data.explanation || q.explanation || 'The correct answer is highlighted above.';
      setExplanation(text);
      explanationsRef.current[currentQ] = text;
      setResultExplanations(prev => ({ ...prev, [currentQ]: text }));
    } catch {
      const text = q.explanation || 'The correct answer is highlighted above. Keep going!';
      setExplanation(text);
      explanationsRef.current[currentQ] = text;
      setResultExplanations(prev => ({ ...prev, [currentQ]: text }));
    } finally {
      setLoadingExplain(false);
    }
  }

  // ── MCQ handlers ────────────────────────────────────────────────
  async function handleMcqAnswer(optIdx: number) {
    if (mcqDone || mcqSelected !== null) return;
    const q = questions[currentQ];
    const isCorrect = optIdx === (q.correct as number);
    setMcqSelected(optIdx);
    const attempts = mcqAttempts + 1;
    setMcqAttempts(attempts);

    if (isCorrect) {
      setMcqDone(true);
      // fetch explanation for correct answer too
      fetchExplanation(q, q.options[optIdx], q.options[q.correct as number], true);
    } else if (attempts < 2) {
      // 1st wrong — allow retry with hint available
      setTimeout(() => {
        setMcqSelected(null); // unlock for retry
        setShowMcqHint(true);
      }, 900);
    } else {
      // 2nd wrong — lock and show explanation
      setMcqDone(true);
      fetchExplanation(q, q.options[optIdx], q.options[q.correct as number], false);
    }
  }

  // ── Fill-blank handlers ─────────────────────────────────────────
  async function handleFillSubmit() {
    if (!fillInput.trim() || fillValidating) return;
    setFillValidating(true);
    try {
      const resp = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/validate-fill-blank`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentAnswer: fillInput.trim(), correctAnswer: questions[currentQ].correct, question: questions[currentQ].question }),
      });
      const { correct } = await resp.json();
      if (correct) {
        const text = questions[currentQ].explanation || 'Excellent! That\'s correct!';
        setFillFeedback('correct');
        setExplanation(text);
        explanationsRef.current[currentQ] = text;
        setResultExplanations(prev => ({ ...prev, [currentQ]: text }));
      } else {
        const attempts = fillAttempts + 1;
        setFillAttempts(attempts);
        if (attempts === 1) setFillFeedback('wrong1');
        else if (attempts === 2) setFillFeedback('wrong2');
        else {
          setFillFeedback('revealed');
          const text = questions[currentQ].explanation || '';
          setExplanation(text);
          explanationsRef.current[currentQ] = text;
          setResultExplanations(prev => ({ ...prev, [currentQ]: text }));
        }
      }
    } catch {
      setFillFeedback('correct'); // network error — give benefit of doubt
      const text = questions[currentQ].explanation || '';
      setExplanation(text);
      explanationsRef.current[currentQ] = text;
      setResultExplanations(prev => ({ ...prev, [currentQ]: text }));
    } finally {
      setFillValidating(false);
    }
  }

  return {
    phase, questions, currentQ, score,
    mcqSelected, mcqAttempts, showMcqHint, mcqDone,
    fillInput, setFillInput, fillAttempts, fillFeedback, fillValidating,
    explanation, loadingExplain,
    attemptNumber, perQuestionResultsRef, explanationsRef, quizStartTimeRef,
    resultExplanations,
    fetchQuiz, goNext, goPrev, handleMcqAnswer, handleFillSubmit,
  };
}
