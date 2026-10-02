import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCalibrationPassage, fetchLexile, fetchPassage, fetchPassageList } from '../services/readAloudApi';
import type { DifficultyFilter, Passage, PassageSummary } from '../types';
import { splitWords } from '../utils/wordMatching';
import { SKIPPED_CALIBRATION_LEXILE } from '../utils/scoring';

type ListResult = { key: string; passages: PassageSummary[]; error: string | null };

// The student's Lexile level and the grade's passage list (re-sorted when the level changes).
export function usePassageLibrary(grade: string) {
  const [lexile, setLexile] = useState<number | null>(null);
  const [needsCalibration, setNeedsCalibration] = useState(false);
  const [filter, setFilter] = useState<DifficultyFilter>('all');
  const [reloadCount, setReloadCount] = useState(0);
  const [list, setList] = useState<ListResult | null>(null);
  const [loadingPassage, setLoadingPassage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLexile()
      .then((data) => {
        if (cancelled) return;
        setNeedsCalibration(!!data.needsCalibration);
        setLexile(data.needsCalibration ? null : data.lexile);
      })
      .catch(() => { /* no level yet: show every passage */ });
    return () => { cancelled = true; };
  }, []);

  const key = `${grade}|${lexile ?? ''}|${reloadCount}`;
  useEffect(() => {
    let cancelled = false;
    fetchPassageList(grade, lexile)
      .then((passages) => { if (!cancelled) setList({ key, passages, error: null }); })
      .catch((err: Error) => { if (!cancelled) setList({ key, passages: [], error: err.message || 'Could not load stories' }); });
    return () => { cancelled = true; };
  }, [grade, lexile, key]);

  const loading = list?.key !== key;
  // Keep showing the previous list while a re-sorted one loads.
  const passages = useMemo(() => list?.passages ?? [], [list]);
  const filtered = useMemo(() => (filter === 'all' ? passages : passages.filter((p) => p.level === filter)), [passages, filter]);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  const loadPassage = useCallback(async (title?: string): Promise<Passage> => {
    setLoadingPassage(true);
    try {
      return await fetchPassage(grade, title);
    } finally {
      setLoadingPassage(false);
    }
  }, [grade]);

  const loadCalibrationPassage = useCallback(async (): Promise<Passage> => {
    const data = await fetchCalibrationPassage(grade);
    return { title: data.title, text: data.text, topic: 'Calibration', level: 'medium', wordCount: splitWords(data.text || '').length };
  }, [grade]);

  const skipCalibration = useCallback(() => {
    setNeedsCalibration(false);
    setLexile(SKIPPED_CALIBRATION_LEXILE);
  }, []);

  const applyLexile = useCallback((value: number | null | undefined) => {
    if (value == null) return;
    setLexile(value);
    setNeedsCalibration(false);
  }, []);

  const cancelCalibration = useCallback(() => setNeedsCalibration(false), []);

  return {
    lexile,
    needsCalibration,
    passages: filtered,
    hasPassages: passages.length > 0,
    // Spinner on the first load and on a retry after an error.
    loading: loading && (!list || !!list.error),
    error: loading ? null : list?.error ?? null,
    filter,
    setFilter,
    reload,
    loadPassage,
    loadingPassage,
    loadCalibrationPassage,
    skipCalibration,
    applyLexile,
    cancelCalibration,
  };
}
