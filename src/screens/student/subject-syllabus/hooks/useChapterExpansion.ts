import { useEffect, useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { type SyllabusChapter } from '../../../../data/cbseG6EnglishSyllabus';

// Deep-link support: the Dashboard's Learning Path list links straight to a
// specific chapter (e.g. tapping "Fables and Folk Tales" there should land
// here with THAT chapter already expanded, not always chapter 1).
export function useChapterExpansion(chapters: SyllabusChapter[], wantChapterTitle: string | undefined) {
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    if (!wantChapterTitle || chapters.length === 0) return;
    const idx = chapters.findIndex(c => c.title === wantChapterTitle);
    if (idx !== -1) setOpenChapters(new Set([idx]));
  }, [wantChapterTitle, chapters]);

  function toggleChapter(idx: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenChapters(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  return { openChapters, toggleChapter };
}
