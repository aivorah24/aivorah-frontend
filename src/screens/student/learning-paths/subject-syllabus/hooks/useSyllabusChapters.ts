import { useEffect, useState } from 'react';
import { type SyllabusChapter } from '../../../../../data/cbseG6EnglishSyllabus';
import { fetchPublishedSyllabus, getCuratedSyllabus } from '../api';

export function useSyllabusChapters(curriculum: string, grade: string, subject: string) {
  const [dbChapters, setDbChapters] = useState<SyllabusChapter[] | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // data fetching effect — reset loading/error state before the async fetch below
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingDb(true);
    setLoadError(false);
    fetchPublishedSyllabus(curriculum, grade, subject).then((units) => {
      if (cancelled) return;
      // Real teacher-published content takes priority over the pre-pipeline
      // curated fallback — this is what makes the upload -> student loop real.
      setDbChapters(units.length > 0 ? (units as unknown as SyllabusChapter[]) : null);
      setLoadingDb(false);
    }).catch(() => {
      // A 404, a null body or a network failure must not leave the student on a
      // blank screen — fall through to the "being prepared" state below.
      if (cancelled) return;
      setLoadError(true);
      setLoadingDb(false);
    });
    return () => { cancelled = true; };
  }, [curriculum, grade, subject]);

  const chapters = dbChapters ?? getCuratedSyllabus(curriculum, grade, subject) ?? [];
  const isDbBacked = !!dbChapters;

  return { chapters, isDbBacked, loadingDb, loadError };
}
