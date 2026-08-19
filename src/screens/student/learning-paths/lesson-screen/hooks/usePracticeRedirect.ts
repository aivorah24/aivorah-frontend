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
  },
) {
  useEffect(() => {
    if (mode !== 'practice' || !topic) return;
    setMode('read');
    navigation.navigate('Quiz', {
      topic: topic.name, grade: params.grade, subject: params.subject, curriculum: params.curriculum, topicId: params.topicId,
      passageText: (topic as any).readText
        ? `${(topic as any).readText.intro} ${(topic as any).readText.body?.join(' ') ?? ''}`.trim()
        : undefined,
      returnTo: 'LessonScreen',
      returnParams: { subject: params.subject, curriculum: params.curriculum, grade: params.grade, chapterIndex: params.chapterIndex, topicIndex: params.topicIndex },
    });
  }, [mode, topic]);
}
