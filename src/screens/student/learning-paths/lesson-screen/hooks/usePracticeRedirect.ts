import { useEffect } from 'react';
import type { Mode } from '../types';

// Practice tab: go straight to the quiz — no intermediate "Start Practice"
// card. We flip mode back to 'read' right after launching so returning from
// the quiz doesn't immediately re-trigger navigation (no loop).
export function usePracticeRedirect(
  mode: Mode,
  setMode: (m: Mode) => void,
  topic: any,
  navigation: any,
  params: {
    grade: string; subject: string; curriculum: string; topicId: string | undefined;
    chapterIndex: number; topicIndex: number;
    // A Qdrant/byName-resolved topic (Bug #8) has no topicId at all — without
    // its name and chapter title in returnParams, LessonScreen can't tell
    // this is a DB/Qdrant-backed topic on the way back from Quiz, falls back
    // to the curated syllabusRegistry (Grade 6 only), finds nothing for e.g.
    // Grade 11 Accountancy, and shows "This lesson isn't available yet"
    // instead of the real lesson. See BUGS_AND_FIXES.md.
    byNameTopic: string | undefined;
    chapterTitle: string | undefined;
    // Teacher-published Curriculum Learning Path topic (see LessonScreen's
    // teacherContent branch) — has neither topicId nor byNameTopic, so it
    // must round-trip through the quiz the same way byNameTopic does, or
    // returning from Quiz loses the content and shows "not available".
    teacherContent?: unknown;
    editKey?: string;
    // Questions built from the book for this section ({ question, options, correctIndex, explanation, page }).
    bookQuiz?: any[];
  },
  contentReady: boolean = true,
  locked: boolean = false,
) {
  useEffect(() => {
    if (mode !== 'practice' || !topic) return;
    // Not learned yet: stay on the Practice tab, which explains how to unlock it.
    if (locked) return;
    // No real content for this topic — stay on 'practice' so LessonScreen's
    // ComingSoonPane renders instantly instead of navigating into a Quiz
    // screen that would spin on "Preparing your practice test…" generating
    // questions from nothing.
    if (!contentReady) return;
    setMode('read');
    // Teacher-authored practice questions (Phase 2) — when present, Quiz
    // uses these directly and skips the /ibpyp/quiz generation call.
    const bookQuiz = Array.isArray(params.bookQuiz) ? params.bookQuiz.filter((q: any) => q && q.question && Array.isArray(q.options)) : [];
    const practiceQuiz = (params.teacherContent as any)?.practiceQuiz || (bookQuiz.length ? bookQuiz.map((q: any) => ({
      type: 'mcq', question: q.question, options: q.options, correct: q.correctIndex,
      hint: q.page ? `Look again at page ${q.page} of your book.` : 'Read this part in Learn once more.',
      explanation: q.explanation || '',
    })) : undefined);
    navigation.navigate('Quiz', {
      topic: topic.name, grade: params.grade, subject: params.subject, curriculum: params.curriculum, topicId: params.topicId,
      passageText: (topic as any).readText
        ? `${(topic as any).readText.intro} ${(topic as any).readText.body?.join(' ') ?? ''}`.trim()
        : undefined,
      practiceQuiz,
      returnTo: 'LessonScreen',
      returnParams: {
        subject: params.subject, curriculum: params.curriculum, grade: params.grade,
        chapterIndex: params.chapterIndex, topicIndex: params.topicIndex,
        topicId: params.topicId, byNameTopic: params.byNameTopic, chapterTitle: params.chapterTitle,
        topicName: params.byNameTopic || (params.teacherContent ? topic.name : undefined),
        teacherContent: params.teacherContent,
        editKey: params.editKey,
      },
    });
  }, [mode, topic, contentReady, locked]);
}
