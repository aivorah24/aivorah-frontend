import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { curriculumCacheKey, getMemoryCurriculum, getMemorySubjectChapters } from '../../../../utils/curriculumPrefetch';
import { parseIBPYPCurriculum, parseNCERTCurriculum, FALLBACK_CURRICULUM } from '../utils/curriculumParsers';
import {
  fetchCurriculum,
  fetchNcertChapters,
  fetchCurriculumSubjects,
  fetchUpcomingDeadlines,
  fetchPerformance,
} from '../services/dashboardService';
import type { CurriculumData, PerfData, SubjectChapters, UpcomingDeadline } from '../types';

const CACHE_TTL = 5 * 60 * 1000; // 5 min

interface ChildOverride {
  curriculum: string;
  grade: string;
}

interface UseDashboardDataParams {
  childOverride?: ChildOverride;
  childCurriculum?: string;
  isIBPYP: boolean;
  studentGrade: string;
  studentId?: string;
  userEmail?: string;
  navigation: { addListener: (event: string, cb: () => void) => () => void };
}

// Consolidates the 4 data-fetching effects that used to live directly inside
// DashboardScreen — curriculum (cache-first), subject/chapter names, upcoming
// deadlines, and per-topic quiz performance. Behavior is unchanged from the
// pre-refactor version: same cache keys, same fallback-on-error behavior,
// same "refetch on screen focus" for performance data.
export function useDashboardData({
  childOverride,
  childCurriculum,
  isIBPYP,
  studentGrade,
  studentId,
  userEmail,
  navigation,
}: UseDashboardDataParams) {
  const noContentGrade = ['Nursery', 'LKG', 'UKG'].includes(studentGrade);
  const CACHE_KEY = curriculumCacheKey(isIBPYP, studentGrade);
  const prefetchedCurriculum = !childOverride ? getMemoryCurriculum(CACHE_KEY) : undefined;
  const prefetchedSubjects = !childOverride ? getMemorySubjectChapters(CACHE_KEY) : undefined;

  const [curriculum, setCurriculum] = useState<CurriculumData>(() => {
    if (prefetchedCurriculum) {
      return prefetchedCurriculum.type === 'ibpyp'
        ? parseIBPYPCurriculum(prefetchedCurriculum.data)
        : parseNCERTCurriculum(prefetchedCurriculum.data);
    }
    return FALLBACK_CURRICULUM;
  });
  const [loading, setLoading] = useState(!prefetchedCurriculum);
  const [error, setError] = useState('');
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [perfData, setPerfData] = useState<PerfData>({ topics: {}, avgScore: null });
  const [subjectChapters, setSubjectChapters] = useState<SubjectChapters[]>(prefetchedSubjects ?? []);

  // ── Curriculum (cache-first, falls back to static data if the server is down) ──
  useEffect(() => {
    (async () => {
      try {
        const isGrade3 = studentGrade === 'Grade 3' || studentGrade === 'Class 3';
        const useUnified = childOverride || isIBPYP || !isGrade3;

        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts, type } = JSON.parse(cached);
          setCurriculum((childOverride || type === 'ibpyp') ? parseIBPYPCurriculum(data) : parseNCERTCurriculum(data));
          setLoading(false);
          if (Date.now() - ts < CACHE_TTL) return;
        }

        let data: any;
        if (useUnified) {
          const curricParam = isIBPYP ? 'IB_PYP' : (childCurriculum ?? 'NCERT');
          data = await fetchCurriculum(curricParam, studentGrade);
          setCurriculum(parseIBPYPCurriculum(data));
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now(), type: 'ibpyp' }));
        } else {
          data = await fetchNcertChapters();
          setCurriculum(parseNCERTCurriculum(data));
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now(), type: 'ncert' }));
        }
        setLoading(false);
      } catch {
        setCurriculum(FALLBACK_CURRICULUM);
        setLoading(false);
      }
    })();
  }, [studentGrade, childCurriculum, childOverride?.curriculum, childOverride?.grade]);

  // ── Real chapter counts + names across all subjects for this grade ──
  useEffect(() => {
    if (noContentGrade) { setSubjectChapters([]); return; }
    const curricParam = isIBPYP ? 'IB_PYP' : (childCurriculum ?? 'NCERT');
    fetchCurriculumSubjects(curricParam, studentGrade)
      .then(d => {
        if (!Array.isArray(d.subjects)) return;
        setSubjectChapters(d.subjects.map((s: any) => ({
          subject: s.subject,
          chapters: (s.chapters?.length ? s.chapters.map((c: any) => c.title) : s.units) || [],
        })));
      })
      .catch(() => {});
  }, [isIBPYP, childCurriculum, studentGrade, noContentGrade]);

  // ── Upcoming deadlines ──
  useEffect(() => {
    if (!studentId || childOverride) return;
    fetchUpcomingDeadlines(studentId)
      .then(d => { if (Array.isArray(d)) setUpcomingDeadlines(d); })
      .catch(() => {});
  }, [studentId, childOverride]);

  // ── Per-topic quiz performance — refetches on screen focus too ──
  const fetchPerfData = useCallback(() => {
    if (!studentId || !userEmail || childOverride) return;
    fetchPerformance(studentId, userEmail)
      .then(d => { if (d.topics) setPerfData(d); })
      .catch(() => {});
  }, [studentId, userEmail, childOverride]);

  useEffect(() => { fetchPerfData(); }, [fetchPerfData]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchPerfData);
    return unsub;
  }, [navigation, fetchPerfData]);

  return {
    curriculum,
    loading,
    error,
    setError,
    upcomingDeadlines,
    perfData,
    subjectChapters,
    noContentGrade,
  };
}
