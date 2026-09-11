import { useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

interface UseQuizGenerationArgs {
  chapter: string;
  subject: string;
  grade: string;
  curriculum: string;
  quizDifficulty: 'easy' | 'medium' | 'hard';
  quizCount: number;
  quizType: 'mcq' | 'fill_blank' | 'mixed';
  teacherNotes: string;
  selectedLanguage: string;
  setQuizQuestions: (v: any[]) => void;
  setQuestions: (v: string[]) => void;
  setFormError: (v: string) => void;
}

// Owns the standalone MCQ/fill-blank quiz generation flow (grade/curriculum-
// driven, not from an uploaded worksheet), including the NCERT-quiz
// fallback path for local servers missing /assignments/generate-quiz —
// extracted verbatim (no behavior change) from TeacherAssignmentsScreen.tsx,
// seventh step of its hooks/components decomposition (2026-08-25).
export function useQuizGeneration({
  chapter, subject, grade, curriculum, quizDifficulty, quizCount, quizType, teacherNotes,
  selectedLanguage, setQuizQuestions, setQuestions, setFormError,
}: UseQuizGenerationArgs) {
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  async function generateQuiz() {
    if (!chapter.trim() && !subject.trim()) { setFormError('Enter a chapter or topic first'); return; }
    setGeneratingQuiz(true); setFormError('');

    const applyQuestions = (items: any[]) => {
      const normalized = (items || [])
        .map((q: any, i: number) => {
          const question = String(q?.question || '').trim();
          if (!question) return null;

          // fill_blank type
          if (q?.type === 'fill_blank') {
            return {
              id: q?.id || `q${i + 1}`,
              question,
              type: 'fill_blank',
              options: [],
              correct: String(q?.correct || '').trim(),
              hint: q?.hint || '',
              explanation: q?.explanation || '',
            };
          }

          // MCQ type
          const options = Array.isArray(q?.options)
            ? q.options.map((o: any) => String(o).replace(/^[A-D]\.\s*/i, '').trim()).filter(Boolean)
            : [];
          if (options.length < 2) return null;

          let correct = '';
          if (typeof q?.correct === 'number' && options[q.correct]) {
            correct = options[q.correct];
          } else if (typeof q?.correct === 'string') {
            const letter = q.correct.trim().match(/^([A-D])(?:\.|\b)/i)?.[1]?.toUpperCase();
            if (letter) {
              const idx = 'ABCD'.indexOf(letter);
              correct = idx >= 0 && options[idx] ? options[idx] : q.correct.replace(/^[A-D]\.\s*/i, '').trim();
            } else {
              correct = q.correct.replace(/^[A-D]\.\s*/i, '').trim();
            }
          }
          if (!correct || !options.some((opt: string) => opt.toLowerCase() === correct.toLowerCase())) {
            correct = options[0];
          } else {
            correct = options.find((opt: string) => opt.toLowerCase() === correct.toLowerCase()) || options[0];
          }

          return {
            id: q?.id || `q${i + 1}`,
            question,
            type: 'mcq',
            options,
            correct,
            hint: q?.hint || '',
            explanation: q?.explanation || '',
          };
        })
        .filter((q: any) => q?.question);

      if (normalized.length === 0) return false;
      setQuizQuestions(normalized);
      setQuestions(normalized.map((q: any) => q.question));
      return true;
    };

    const fallbackToNcertQuiz = async () => {
      try {
        const topic = chapter.trim() || subject.trim();
        const fallbackPath = subject.toLowerCase().includes('science') ? '/ncert/science-quiz' : '/ncert/quiz';
        const fallbackRes = await fetch(`${SERVER_URL}${fallbackPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, context: teacherNotes.trim() }),
        });
        const fallbackData = await fallbackRes.json().catch(() => null);
        if (!fallbackRes.ok || !Array.isArray(fallbackData?.questions)) return false;

        const mapped = fallbackData.questions
          .slice(0, quizCount)
          .map((q: any, i: number) => {
            const options = Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [];
            const idx = typeof q.correct === 'number' ? q.correct : Number(q.correct);
            const validIdx = Number.isInteger(idx) && idx >= 0 && idx < options.length;
            const correct = validIdx ? options[idx] : (typeof q.correct === 'string' ? q.correct : (options[0] || ''));
            return {
              id: q.id || `q${i + 1}`,
              question: String(q.question || ''),
              type: 'mcq',
              options,
              correct,
              hint: q.hint || '',
              explanation: q.explanation || '',
            };
          })
          .filter((q: any) => q.question);

        if (mapped.length === 0) return false;
        applyQuestions(mapped);
        return true;
      } catch {
        return false;
      }
    };

    try {
      const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, chapter: chapter.trim(), grade, curriculum, difficulty: quizDifficulty, count: quizCount, teacherNotes: teacherNotes.trim(), quizType, language: subject === 'Language Acquisition' ? selectedLanguage : undefined }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.questions)) {
        if (applyQuestions(data.questions)) return;
      }

      // Some local servers expose /ncert/quiz but not /assignments/generate-quiz.
      if (res.status === 404 || !data) {
        const recovered = await fallbackToNcertQuiz();
        if (recovered) return;
      }

      setFormError(data?.error || 'Could not generate quiz. Check chapter/topic.');
    } catch {
      const recovered = await fallbackToNcertQuiz();
      if (!recovered) setFormError('Network error generating quiz.');
    } finally {
      setGeneratingQuiz(false);
    }
  }

  return { generatingQuiz, generateQuiz };
}
