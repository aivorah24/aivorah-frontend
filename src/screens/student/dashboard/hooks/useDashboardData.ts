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
  fetchLearningPathSubjects,
  fetchSubjectSyllabus,
  fetchWeeklyActivity,
} from '../services/dashboardService';
import type { SubjectSyllabusData, WeeklyDay } from '../../utils/learningPathProgress';
import type { CurriculumData, CurriculumTopic, PerfData, SubjectChapters, UpcomingDeadline } from '../types';
import { monolithContentCurriculum, isSyllabusOnlyCurriculum } from '../../../../utils/curriculum';

// Reshapes a /curriculum/subjects response (per-subject topic lists, used by
// the Learning Path screen) into the flat CurriculumData shape this hook's
// consumers expect — used for IB DP, which has no equivalent flat /curriculum
// endpoint on the monolith (its data lives in Qdrant, not there).
function curriculumFromSubjects(data: { subjects?: { subject: string; topics: { topic: string; unit: string; grade?: string }[] }[] }, grade: string): CurriculumData {
  const topics: CurriculumTopic[] = (data.subjects || []).flatMap((s) =>
    s.topics.map((t) => ({ grade: t.grade || grade, subject: s.subject, unit: t.unit || 'General', topic: t.topic, content_type: 'text' }))
  );
  const grouped: CurriculumData['grouped'] = {};
  topics.forEach((t) => {
    if (!grouped[t.grade]) grouped[t.grade] = {};
    if (!grouped[t.grade][t.subject]) grouped[t.grade][t.subject] = [];
    grouped[t.grade][t.subject].push({ topic: t.topic, unit: t.unit });
  });
  return { grades: [grade], topics, grouped, totalTopics: topics.length };
}

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
  // Curriculum exactly as the Learning Paths screen sends it ('CBSE' for
  // CBSE/NCERT, otherwise the profile value) — subjects and per-subject
  // syllabi below are fetched with it so both screens read the same data.
  learningPathCurriculum: string;
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
  learningPathCurriculum,
  studentId,
  userEmail,
  navigation,
}: UseDashboardDataParams) {
  const noContentGrade = ['Nursery', 'LKG', 'UKG'].includes(studentGrade);
  // IB DP and IB MYP have no flat /curriculum endpoint on the monolith (their
  // content lives in Qdrant via aivorah-learning-paths-service) — the effects
  // below route them through fetchCurriculumSubjects + curriculumFromSubjects
  // instead of fetchCurriculum, so they never silently fall back to the
  // static Class 3 mock curriculum.
  const isIBDP = /^ib.?dp$/i.test((childCurriculum ?? '').trim());
  const isIBMYP = /^ib.?myp$/i.test((childCurriculum ?? '').trim());
  // ICSE + Cambridge (every grade): syllabus-only boards served by the service.
  const needsLearningPathsService = isIBDP || isIBMYP || isSyllabusOnlyCurriculum(childCurriculum);
  const CACHE_KEY = curriculumCacheKey(isIBPYP, studentGrade, childCurriculum);
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
  const [syllabi, setSyllabi] = useState<Record<string, SubjectSyllabusData>>({});
  const [weeklyDays, setWeeklyDays] = useState<WeeklyDay[]>([]);

  // ── Curriculum (cache-first, falls back to static data if the server is down) ──
  useEffect(() => {
    (async () => {
      try {
        if (needsLearningPathsService) {
          // No cache path — this is Qdrant-backed, not the legacy monolith
          // /curriculum cache scheme above, and there's no stale-cache risk
          // worth the extra complexity here yet.
          const subjectsData = await fetchCurriculumSubjects(childCurriculum!, studentGrade);
          setCurriculum(curriculumFromSubjects(subjectsData, studentGrade));
          setLoading(false);
          return;
        }

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
          const curricParam = isIBPYP ? 'IB_PYP' : monolithContentCurriculum(childCurriculum);
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
  }, [studentGrade, childCurriculum, childOverride?.curriculum, childOverride?.grade, needsLearningPathsService]);

  // ── Real chapter counts + names across all subjects for this grade ──
  useEffect(() => {
    if (noContentGrade) {
      // reset for a grade with no content — not derivable inline since the effect
      // also owns the async fetch path below for other grades
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubjectChapters([]);
      return;
    }
    // Same endpoint + curriculum value as the Learning Paths screen
    // (useSubjects.ts) — previously non-CBSE curricula read the monolith's
    // /curriculum/subjects here instead, so the two screens could disagree.
    let cancelled = false;
    fetchLearningPathSubjects(learningPathCurriculum, studentGrade)
      .then(d => {
        if (cancelled || !Array.isArray(d.subjects) || d.subjects.length === 0) return;
        setSubjectChapters(d.subjects.map((s: any) => ({
          subject: s.subject,
          chapters: (s.chapters?.length ? s.chapters.map((c: any) => c.title) : s.units?.map((u: any) => (typeof u === 'string' ? u : u?.title)).filter(Boolean)) || [],
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [learningPathCurriculum, studentGrade, noContentGrade]);

  // ── Each subject's chapters WITH topics (same source as the Learning Paths
  // syllabus screen) — needed to attribute saved progress, which is keyed by
  // topic name, to chapters. One request per subject, in parallel.
  const subjectNamesKey = subjectChapters.map(s => s.subject).join('|');
  useEffect(() => {
    if (noContentGrade || !subjectNamesKey) return;
    let cancelled = false;
    const subjects = subjectNamesKey.split('|');
    Promise.all(subjects.map(subject =>
      fetchSubjectSyllabus(learningPathCurriculum, studentGrade, subject).catch(() => null)
    )).then(results => {
      if (cancelled) return;
      const next: Record<string, SubjectSyllabusData> = {};
      results.forEach(r => { if (r) next[r.subject] = r; });
      setSyllabi(next);
    });
    return () => { cancelled = true; };
  }, [subjectNamesKey, learningPathCurriculum, studentGrade, noContentGrade]);

  // ── Upcoming deadlines ──
  useEffect(() => {
    if (!studentId || childOverride) return;
    fetchUpcomingDeadlines(studentId)
      .then(d => { if (Array.isArray(d)) setUpcomingDeadlines(d); })
      .catch(() => {});
  }, [studentId, childOverride]);

  // ── Per-topic quiz performance + this week's activity — refetched every
  // time the student comes back to the dashboard (the navigator keeps it
  // mounted, so mount-only fetches would show stale numbers) ──
  const fetchProgressData = useCallback(() => {
    if (!studentId || childOverride) return;
    if (userEmail) {
      fetchPerformance(studentId, userEmail)
        .then(d => { if (d && d.topics) setPerfData(d); })
        .catch(() => {});
    }
    fetchWeeklyActivity(studentId)
      .then(d => { if (Array.isArray(d?.days)) setWeeklyDays(d.days); })
      .catch(() => {});
  }, [studentId, userEmail, childOverride]);

  useEffect(() => { fetchProgressData(); }, [fetchProgressData]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchProgressData);
    return unsub;
  }, [navigation, fetchProgressData]);

  return {
    curriculum,
    loading,
    error,
    setError,
    upcomingDeadlines,
    perfData,
    subjectChapters,
    syllabi,
    weeklyDays,
    noContentGrade,
  };
}
