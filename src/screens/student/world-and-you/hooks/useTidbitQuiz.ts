import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SERVER_URL from '../../../../config/worldAndYouServerUrl';
import type { CurrentAffair, QuizQuestion, QuizState } from '../types';
import { normalizeQuizQuestions, quizCacheKey } from '../utils/quizHelpers';

export function useTidbitQuiz({ grade, studentId }: { grade: string; studentId?: string }) {
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quizError, setQuizError] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);

  function resetQuiz() {
    setQuizState('idle');
    setQuestions([]);
    setCurrentQ(0);
  }

  async function startQuiz(currentAffairs: CurrentAffair | undefined) {
    if (!currentAffairs) return;
    const key = quizCacheKey(currentAffairs.headline);
    const done = await AsyncStorage.getItem(key);
    if (done) { setQuizState('already_done'); return; }

    setQuizError('');
    setQuizState('loading');
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    try {
      const resp = await fetch(`${SERVER_URL}/daily-tidbit/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: currentAffairs.headline, summary: currentAffairs.summary, grade }),
      });
      const json = await resp.json();
      if (!json.questions?.length) throw new Error('No questions');
      setQuestions(normalizeQuizQuestions(json.questions));
      setQuizState('active');
    } catch (e: any) {
      setQuizError('Could not load quiz. Please try again.');
      setQuizState('idle');
    }
  }

  async function handleAnswer(idx: number, currentAffairs: CurrentAffair | undefined) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const isCorrect = idx === questions[currentQ].correct;
    const newCount = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(newCount);

    // Last question → finish after short delay
    if (currentQ === questions.length - 1) {
      setTimeout(async () => {
        // Award XP
        let xp = 0;
        if (studentId) {
          try {
            const r = await fetch(`${SERVER_URL}/daily-tidbit/quiz-complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentId, correct: newCount }),
            });
            const j = await r.json();
            xp = j.xpAwarded || 0;
          } catch {}
        }
        setXpEarned(xp);
        setQuizState('done');
        if (currentAffairs) {
          await AsyncStorage.setItem(quizCacheKey(currentAffairs.headline), '1');
        }
      }, 800);
    } else {
      // Next question after delay
      setTimeout(() => {
        setCurrentQ(q => q + 1);
        setSelected(null);
        setAnswered(false);
      }, 800);
    }
  }

  return {
    quizState, quizError, questions, currentQ, selected, answered, correctCount, xpEarned,
    resetQuiz, startQuiz, handleAnswer,
  };
}
