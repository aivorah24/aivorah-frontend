import AsyncStorage from '@react-native-async-storage/async-storage';
import SERVER_URL from '../config/serverUrl';
import LEARNING_PATHS_SERVER_URL from '../config/learningPathsServerUrl';
import { normalizeCurriculum, monolithContentCurriculum } from './curriculum';

// Warms the Dashboard's curriculum data the MOMENT a student's session is
// resolved (login, or a persisted session restored on app open) — instead of
// waiting until they actually navigate to Dashboard and trigger the fetch
// there. Without this, every dashboard visit shows a "Loading your
// dashboard" spinner even though the data rarely changes, which reads as
// broken/slow rather than seamless.
//
// Populates BOTH an in-memory cache (read synchronously by DashboardScreen
// on mount — zero-latency, no spinner) and AsyncStorage (the same keys/shape
// DashboardScreen already reads, so nothing else about its caching changes).

export type CachedCurriculum = { data: any; ts: number; type: 'ibpyp' | 'ncert' };
export type CachedSubjectChapters = { subject: string; chapters: string[] }[];

const memCurriculum = new Map<string, CachedCurriculum>();
const memSubjects = new Map<string, CachedSubjectChapters>();

// `curriculum` used to be omitted (just an isIBPYP boolean) — every non-IB-PYP
// curriculum collapsed onto the same "ncert" bucket, so e.g. a CBSE Grade 11
// student and an IB DP Grade 11 student would silently share (and overwrite)
// the exact same cache entry. Keying on the real curriculum string avoids that.
export function curriculumCacheKey(isIBPYP: boolean, grade: string, curriculum?: string): string {
  const bucket = isIBPYP ? 'ibpyp' : (normalizeCurriculum(curriculum) || 'cbse').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `dashboard_curriculum_${bucket}_${grade}_v1`;
}

export function getMemoryCurriculum(key: string): CachedCurriculum | undefined {
  return memCurriculum.get(key);
}

export function getMemorySubjectChapters(key: string): CachedSubjectChapters | undefined {
  return memSubjects.get(key);
}

const NO_CONTENT_GRADES = ['Nursery', 'LKG', 'UKG'];

// Fire-and-forget — callers must NOT await this on the auth-resolution path,
// it should never delay login.
export async function prefetchStudentDashboard(user: { role?: string; grade?: string; curriculum?: string }): Promise<void> {
  try {
    if (user.role !== 'student') return;
    const studentGrade = user.grade || 'Grade 3';
    if (NO_CONTENT_GRADES.includes(studentGrade)) return;
    // Only real IB PYP matches this path — was `.includes('ib')`, which also
    // caught IB DP/MYP and routed them through the wrong grade range/backend,
    // then cached that failure under a cache key the real Dashboard fetch
    // (useDashboardData.ts, fixed the same way) never looks under — so the
    // stale/empty cache from here was invisible until it silently shadowed
    // real data typed under a DIFFERENT, correct cache key. Both must agree.
    const isIBPYP = !user.curriculum || /^ib.?pyp$/i.test(user.curriculum.trim());
    const isIBDP = !!user.curriculum && /^ib.?dp$/i.test(user.curriculum.trim());
    const isIBMYP = !!user.curriculum && /^ib.?myp$/i.test(user.curriculum.trim());
    const isCambridgeQdrant = !!user.curriculum && /^cambridge$/i.test(user.curriculum.trim()) && parseInt(studentGrade.replace(/\D/g, ''), 10) >= 6;
    const needsLearningPathsService = isIBDP || isIBMYP || isCambridgeQdrant;
    const isGrade3 = studentGrade === 'Grade 3' || studentGrade === 'Class 3';
    const useUnified = isIBPYP || needsLearningPathsService || !isGrade3;
    const cacheKey = curriculumCacheKey(isIBPYP, studentGrade, user.curriculum);

    let data: any;
    let type: 'ibpyp' | 'ncert';
    if (needsLearningPathsService) {
      // IB DP and IB MYP have no data on the monolith's /curriculum or
      // /curriculum/subjects — their content lives in Qdrant via
      // aivorah-learning-paths-service (same source useDashboardData.ts
      // reads for the real fetch on-screen).
      const gradeParam = encodeURIComponent(studentGrade);
      const curricParam = encodeURIComponent(user.curriculum!);
      const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=${gradeParam}&curriculum=${curricParam}`);
      if (!res.ok) return;
      const d = await res.json();
      if (!Array.isArray(d.subjects)) return;
      memSubjects.set(cacheKey, d.subjects.map((s: any) => ({
        subject: s.subject,
        chapters: (s.chapters?.length ? s.chapters.map((c: any) => c.title) : s.units) || [],
      })));
      const topics = d.subjects.flatMap((s: any) => (s.topics || []).map((t: any) => ({ grade: t.grade || studentGrade, subject: s.subject, unit: t.unit || 'General', topic: t.topic })));
      data = { topics, totalTopics: topics.length };
      type = 'ibpyp';
    } else if (useUnified) {
      const curricParam = encodeURIComponent(isIBPYP ? 'IB_PYP' : monolithContentCurriculum(user.curriculum));
      const gradeParam = encodeURIComponent(studentGrade);
      const res = await fetch(`${SERVER_URL}/curriculum?curriculum=${curricParam}&grade=${gradeParam}`);
      if (!res.ok) return;
      data = await res.json();
      type = 'ibpyp';

      // Real chapter/unit names per subject — same authoritative source the
      // Performance bars use (see DashboardScreen's subjectChapters fetch).
      fetch(`${SERVER_URL}/curriculum/subjects?grade=${gradeParam}&curriculum=${curricParam}`)
        .then(r => r.json())
        .then(d => {
          if (!Array.isArray(d.subjects)) return;
          memSubjects.set(cacheKey, d.subjects.map((s: any) => ({
            subject: s.subject,
            chapters: (s.chapters?.length ? s.chapters.map((c: any) => c.title) : s.units) || [],
          })));
        })
        .catch(() => {});
    } else {
      const res = await fetch(`${SERVER_URL}/ncert/chapters`);
      if (!res.ok) return;
      data = await res.json();
      type = 'ncert';
    }

    const ts = Date.now();
    memCurriculum.set(cacheKey, { data, ts, type });
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data, ts, type })).catch(() => {});
  } catch {
    // Best-effort — DashboardScreen falls back to its own fetch if this failed.
  }
}
