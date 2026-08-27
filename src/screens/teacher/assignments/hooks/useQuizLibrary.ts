import { useCallback, useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';

interface UseQuizLibraryArgs {
  activeTab: string;
  teacherEmail: string;
}

// Owns the Quiz Library tab's list/filter state + the single-quiz preview
// fetch — extracted verbatim (no behavior change) from
// TeacherAssignmentsScreen.tsx, fourth step of its hooks/components
// decomposition (2026-08-25).
export function useQuizLibrary({ activeTab, teacherEmail }: UseQuizLibraryArgs) {
  const [librarySubject, setLibrarySubject] = useState('');
  const [libraryGrade, setLibraryGrade] = useState('');
  const [libraryQuizzes, setLibraryQuizzes] = useState<any[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryPreviewQuiz, setLibraryPreviewQuiz] = useState<any>(null);
  const [libraryPreviewLoading, setLibraryPreviewLoading] = useState(false);

  // Fetch Quiz Library quizzes when tab is active or filters change
  const fetchLibraryQuizzes = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryLoaded(false);
    try {
      const params = new URLSearchParams();
      if (librarySubject) params.set('subject', librarySubject);
      if (libraryGrade) params.set('grade', libraryGrade);
      // The auth User type has no id field (only email/name/role/etc.) — send the
      // teacher's email; the server resolves either an email or a UUID.
      if (teacherEmail) params.set('teacherId', teacherEmail);
      const res = await fetch(`${SERVER_URL}/quiz/list?${params.toString()}`);
      const d = await res.json();
      setLibraryQuizzes(d.quizzes || []);
    } catch { setLibraryQuizzes([]); }
    setLibraryLoading(false);
    setLibraryLoaded(true);
  }, [librarySubject, libraryGrade, teacherEmail]);

  useEffect(() => {
    // data fetching effect — setState happens inside fetchLibraryQuizzes, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab === 'Quiz Library') fetchLibraryQuizzes();
  }, [activeTab, fetchLibraryQuizzes]);

  async function openLibraryPreview(q: any) {
    setLibraryPreviewQuiz(q);
    setLibraryPreviewLoading(true);
    try {
      const r = await fetch(`${SERVER_URL}/quiz/${q.id}`);
      const d = await r.json();
      if (d.quiz) setLibraryPreviewQuiz({ ...q, quiz_data: d.quiz.quiz_data, ...d.quiz });
    } catch {}
    setLibraryPreviewLoading(false);
  }

  return {
    librarySubject, setLibrarySubject, libraryGrade, setLibraryGrade,
    libraryQuizzes, libraryLoading, libraryLoaded,
    libraryPreviewQuiz, setLibraryPreviewQuiz, libraryPreviewLoading,
    fetchLibraryQuizzes, openLibraryPreview,
  };
}
