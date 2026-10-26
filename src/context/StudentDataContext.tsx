import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AUTH_SERVER_URL from '../config/authServerUrl';
import LEADERBOARD_SERVICE_URL from '../config/leaderboardServiceUrl';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { useAuth } from './AuthContext';
import type { LearningActivity } from '../screens/student/utils/learningPathProgress';

// Known email → fixed UUID map (bypasses /user/sync for seeded accounts)
const DEMO_IDS: Record<string, string> = {
  'alex@demo.com':    '00000000-0000-0000-0000-000000000001',
  'mia@demo.com':     '00000000-0000-0000-0000-000000000002',
  'student@demo.com': '00000000-0000-0000-0000-000000000001',
  // Demo accounts (interconnected: Anaya + Meera + Priya)
  'anaya@aivorah.ai': 'a1000000-0000-0000-0000-000000000001',
  // IB PYP test accounts (real Supabase UUIDs)
  'aanya@test.ai':    '106a2ac6-1e17-4fd7-a82c-7d8ded943100',
  'ishaan@test.ai':   '8cade9a5-8e27-414c-9087-d95e2ef37d5f',
  'rohan@test.ai':    '2ff12fbc-c676-4b10-a25f-bedabc1a7784',
  'diya@test.ai':     '6015c3bf-774a-4fd2-bf90-4da5b06fdc13',
  // NCERT test accounts
  'arjun@test.ai':    'aaaa0000-0000-0000-0000-000000000001',
  'priya@test.ai':    'aaaa0000-0000-0000-0000-000000000002',
  'rahul@test.ai':    'aaaa0000-0000-0000-0000-000000000003',
  'zara@test.ai':     'aaaa0000-0000-0000-0000-000000000004',
  'kavya@test.ai':    'aaaa0000-0000-0000-0000-000000000005',
};

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface StudentStats {
  studyTimeMinutes:    number;
  learningPathMinutes: number;
  assignmentTimeMinutes: number;
  challengeTimeMinutes:  number;
  topicsExplored:      number;
  xpPoints:            number;
  level:               number;
  challengesCompleted: number;
  assignmentsDone:     number;
  currentStreak:       number;
  lastActiveDate:      string;
  todayStudyMinutes:   number;
  todayXP:             number;
  completedTopics:     string[];
  lastLesson:          string;
  totalTopics:         number;
  // B002/B003 fix: topics a student has opened Learn/Listen for but not yet
  // passed a quiz on — the "In Progress" signal that didn't exist before.
  // Local-only (not yet synced server-side); a missing field on old cached or
  // server records safely defaults to [] via `{ ...ZERO_STATS, ...data }`
  // everywhere stats are hydrated, so existing records are unaffected.
  startedTopics:       string[];
}

interface StudentDataContextType {
  stats:             StudentStats;
  studentId:         string;
  // True only when the initial load genuinely failed after retries AND no
  // cached fallback was found either — i.e. what's showing may not be real
  // zero progress, it's "we don't know yet". Distinct from a real student
  // whose stats are actually all zero (statsLoadError stays false for them).
  statsLoadError:    boolean;
  refreshStats:      () => void;
  addXP:             (xp: number) => void;
  exploreTopic:      () => void;
  // B001/B002/B003 fix: call when a student opens Learn/Listen for a specific
  // topic (not just views a chapter list) — marks it In Progress and awards
  // the existing explore-XP exactly once per topic (no double-counting on
  // repeat opens). Does not change exploreTopic()'s own signature/behavior.
  startTopicActivity: (topic: string) => void;
  completeLesson:    (topic: string, subject?: string, grade?: string, curriculum?: string) => void;
  completeChallenge: (xpAwarded?: number) => void;
  completeAssignment:() => void;
  recordStudyTime:   (minutes: number, source?: StudySource, subject?: string) => void;
  // Carries sub-minute remainders forward so short sessions still add up.
  recordStudySeconds: (seconds: number, source?: StudySource, subject?: string) => void;
  // Device-local Learning Path activity per topic name: when it was last
  // opened, and quiz results the server may not be serving yet (the quiz's
  // track-result write is fire-and-forget). Lets the dashboard show the
  // topic the student just left / just finished without a hard refresh.
  // Kept OUT of `stats` so it is never PUT to /student/:id.
  learningActivity:  LearningActivity;
  recordQuizResult:  (topic: string, score: number, subject?: string) => void;
}

export type StudySource = 'learningPath' | 'assignment' | 'challenge' | 'other';

// ─────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────

const MAX_ACTIVITY_TOPICS = 200;
const MAX_QUIZZES_PER_TOPIC = 10;

const ZERO_STATS: StudentStats = {
  studyTimeMinutes:    0,
  learningPathMinutes: 0,
  assignmentTimeMinutes: 0,
  challengeTimeMinutes:  0,
  topicsExplored:      0,
  xpPoints:            0,
  level:               1,
  challengesCompleted: 0,
  assignmentsDone:     0,
  currentStreak:       0,
  lastActiveDate:      '',
  todayStudyMinutes:   0,
  todayXP:             0,
  completedTopics:     [],
  lastLesson:          '',
  totalTopics:         0,
  startedTopics:       [],
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

export function computeLevel(xp: number): number {
  let level = 1, threshold = 500, total = 0;
  while (xp >= total + threshold) { total += threshold; threshold += 250; level++; }
  return level;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Resolve the Supabase UUID for a logged-in user's email
//
// The server is always the source of truth: a cached UUID from AsyncStorage
// is used ONLY as an offline fallback when /user/sync itself can't be
// reached, never trusted ahead of it. Cached-first (the previous order)
// caused a real bug — if an account is deleted and recreated (e.g. via
// Settings > Delete Account, then signing back in with the same email),
// the server hands out a brand-new id, but a stale device kept returning
// the OLD id forever since some cached value existed and matched the UUID
// shape, regardless of whether it still pointed at a real row. The student
// then silently queried every assignment/challenge/stats endpoint with a
// dead id — assigned work never appeared, with no error anywhere, because
// every request "succeeded" against an id nothing is actually attached to.
export async function resolveStudentId(email: string): Promise<string> {
  const key = `@student_id_${email}`;

  // 1. Demo shortcut
  if (DEMO_IDS[email]) return DEMO_IDS[email];

  // 2. Sync with server → get the current, authoritative UUID
  try {
    const res = await fetchWithRetry(`${AUTH_SERVER_URL}/user/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: 'student' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.id) {
        await AsyncStorage.setItem(key, data.id);
        return data.id;
      }
    }
  } catch { /* offline — fall through to cache */ }

  // 3. Offline fallback: last known-good id from a previous successful sync
  const cached = await AsyncStorage.getItem(key);
  if (cached && cached.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return cached;
  }

  // 4. Last resort: generate stable offline ID from email hash
  const fallback = await AsyncStorage.getItem(key + '_offline');
  if (fallback) return fallback;
  const offlineId = '00000000-0000-0000-0000-' + [...email].reduce((a, c) => a + c.charCodeAt(0), 0).toString().padStart(12, '0');
  await AsyncStorage.setItem(key + '_offline', offlineId);
  return offlineId;
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

const StudentDataContext = createContext<StudentDataContextType>({
  stats:             ZERO_STATS,
  studentId:         '',
  statsLoadError:    false,
  refreshStats:      () => {},
  addXP:             () => {},
  exploreTopic:      () => {},
  startTopicActivity: () => {},
  completeLesson:    () => {},
  completeChallenge: () => {},
  completeAssignment:() => {},
  recordStudyTime:   () => {},
  recordStudySeconds: () => {},
  learningActivity:  {},
  recordQuizResult:  () => {},
});

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stats,          setStats]          = useState<StudentStats>(ZERO_STATS);
  const [studentId,      setStudentId]      = useState('');
  const [loaded,         setLoaded]         = useState(false);
  const [statsLoadError, setStatsLoadError] = useState(false);
  const [retryTick,      setRetryTick]      = useState(0);
  const reconcilingRef = useRef(false);
  // Tracks which email the zero-reset below has already run for, so a
  // manual refreshStats() retry (same email, retryTick bumped) doesn't wipe
  // out real/cached stats back to zero while it re-fetches — only an actual
  // account switch should ever do that.
  const lastResetEmailRef = useRef<string | null>(null);
  // Synchronous mirror of stats.startedTopics, used only to guard
  // startTopicActivity against rapid duplicate calls in the same tick (see
  // startTopicActivity below) — kept in sync with `stats` whenever it loads
  // or is reconciled from the server, so a fresh load/account switch doesn't
  // leave stale entries behind.
  const startedTopicsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    startedTopicsRef.current = new Set(stats.startedTopics);
  }, [stats.startedTopics]);

  // ── Device-local learning activity (see learningActivity above) ──
  const [learningActivity, setLearningActivity] = useState<LearningActivity>({});
  const activityLoadedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    activityLoadedForRef.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on account switch before the async load below
    setLearningActivity({});
    AsyncStorage.getItem(`@lp_activity_${studentId}`)
      .then(raw => {
        if (cancelled) return;
        // Merge rather than replace: activity recorded while the read was in
        // flight must not be lost.
        if (raw) setLearningActivity(prev => ({ ...JSON.parse(raw), ...prev }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) activityLoadedForRef.current = studentId; });
    return () => { cancelled = true; };
  }, [studentId]);
  useEffect(() => {
    if (!studentId || activityLoadedForRef.current !== studentId) return;
    AsyncStorage.setItem(`@lp_activity_${studentId}`, JSON.stringify(learningActivity)).catch(() => {});
  }, [learningActivity, studentId]);

  function touchActivity(topic: string, patch: (prev: LearningActivity[string] | undefined) => LearningActivity[string]) {
    if (!topic) return;
    setLearningActivity(prev => {
      const next = { ...prev, [topic]: patch(prev[topic]) };
      // Bounded: keep the most recently touched topics only.
      const names = Object.keys(next);
      if (names.length <= MAX_ACTIVITY_TOPICS) return next;
      const latest = (n: string) => {
        const a = next[n];
        return [a.lastOpenedAt ?? '', ...(a.quizzes ?? []).map(q => q.at)].reduce((m, t) => (t > m ? t : m), '');
      };
      const keep = names.sort((x, y) => latest(y).localeCompare(latest(x))).slice(0, MAX_ACTIVITY_TOPICS);
      return Object.fromEntries(keep.map(n => [n, next[n]]));
    });
  }

  function recordQuizResult(topic: string, score: number, subject?: string) {
    if (!Number.isFinite(score)) return;
    const at = new Date().toISOString();
    touchActivity(topic, prev => ({
      ...prev,
      subject: subject ?? prev?.subject,
      quizzes: [...(prev?.quizzes ?? []), { score, at }].slice(-MAX_QUIZZES_PER_TOPIC),
    }));
  }

  // ── Load from server — re-run whenever logged-in email changes, or when
  // refreshStats() is called after a failed load ──
  useEffect(() => {
    if (!user?.email) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- early-return branch of the data-fetch effect below, external sync
    if (user?.role && user.role !== 'student') { setLoaded(true); return; }
    setLoaded(false);
    setStatsLoadError(false);
    if (lastResetEmailRef.current !== user.email) {
      lastResetEmailRef.current = user.email;
      setStats(ZERO_STATS);
    }

    async function init() {
      const id = await resolveStudentId(user!.email);
      setStudentId(id);
      try {
        const res = await fetchWithRetry(`${LEADERBOARD_SERVICE_URL}/student/${id}`);
        if (res.ok) {
          const data = await res.json();
          setStats({ ...ZERO_STATS, ...data });
          setStatsLoadError(false);
        } else {
          throw new Error(`GET /student/${id} → ${res.status}`);
        }
      } catch {
        // Retries exhausted — fall back to the last locally-cached snapshot
        // (real progress, just possibly a bit stale) rather than blanking
        // the screen. Only when there's no cache either do we flag this as
        // a genuine load failure, so the UI can say "couldn't load" instead
        // of silently rendering a real student's progress as all zeros.
        let recoveredFromCache = false;
        try {
          const raw = await AsyncStorage.getItem(`@stats_${id}`);
          if (raw) { setStats({ ...ZERO_STATS, ...JSON.parse(raw) }); recoveredFromCache = true; }
        } catch {}
        setStatsLoadError(!recoveredFromCache);
      } finally {
        setLoaded(true);
      }
    }
    init();
  }, [user?.email, retryTick]);

  function refreshStats() {
    setRetryTick(t => t + 1);
  }

  // ── Sync to server whenever stats change ──────────────
  useEffect(() => {
    if (!loaded || !studentId) return;
    // Local backup
    AsyncStorage.setItem(`@stats_${studentId}`, JSON.stringify(stats)).catch(() => {});
    // A reconciliation write (below) shouldn't immediately re-trigger
    // another PUT of the value we just pulled from the server — that would
    // loop forever on a persistently-down network.
    if (reconcilingRef.current) { reconcilingRef.current = false; return; }
    // Server sync (fire-and-forget). If this fails, the local optimistic
    // state (e.g. from addXP) would otherwise stay permanently ahead of the
    // server while every other screen that re-fetches fresh (Leaderboard on
    // focus) keeps showing the real, unsynced value — the reported
    // "XP inconsistent between pages" bug. Reconcile once by re-fetching the
    // server's authoritative stats instead of silently leaving the drift.
    fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(stats),
    }).catch(() => {
      fetchWithRetry(`${LEADERBOARD_SERVICE_URL}/student/${studentId}`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) {
            reconcilingRef.current = true;
            setStats(prev => ({ ...prev, ...data }));
          }
        })
        .catch(() => {});
    });
  }, [stats, loaded, studentId]);

  // Study time is recorded only by screens where real learning happens —
  // TopicLessonScreen / VideoLessonScreen / Learn5EScreen, ChallengesScreen (while
  // a challenge quiz is open), and AssignmentsScreen (while an assignment is open) —
  // never globally, so it reflects actual learning time, not "the app was open".
  // The source tag additionally counts toward the matching per-stream minutes
  // (learningPath / assignment / challenge), which the teacher dashboard uses
  // to report time spent per activity stream, not just an aggregate total.

  const pendingStudySecondsRef = useRef<Record<string, number>>({});
  useEffect(() => { pendingStudySecondsRef.current = {}; }, [studentId]);

  function recordStudySeconds(seconds: number, source: StudySource = 'other', subject?: string) {
    if (!(seconds > 0)) return;
    const key = `${source}|${subject ?? ''}`;
    const total = (pendingStudySecondsRef.current[key] ?? 0) + seconds;
    const mins = Math.floor(total / 60);
    pendingStudySecondsRef.current[key] = total - mins * 60;
    if (mins > 0) recordStudyTime(mins, source, subject);
  }

  function recordStudyTime(mins: number, source: StudySource = 'other', subject?: string) {
    setStats(prev => ({
      ...prev,
      studyTimeMinutes:    prev.studyTimeMinutes    + mins,
      learningPathMinutes: prev.learningPathMinutes + (source === 'learningPath' ? mins : 0),
      assignmentTimeMinutes: prev.assignmentTimeMinutes + (source === 'assignment' ? mins : 0),
      challengeTimeMinutes:  prev.challengeTimeMinutes  + (source === 'challenge'  ? mins : 0),
      todayStudyMinutes:   prev.todayStudyMinutes   + mins,
      lastActiveDate:      todayISO(),
    }));
    // Also push to server
    fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/study-time`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ minutes: mins, source, subject }),
    }).catch(() => {});
  }

  // ── Actions ─────────────────────────────────────────────

  function addXP(xp: number) {
    setStats(prev => {
      const newXP = prev.xpPoints + xp;
      return { ...prev, xpPoints: newXP, level: computeLevel(newXP), todayXP: prev.todayXP + xp, lastActiveDate: todayISO() };
    });
  }

  function exploreTopic() {
    setStats(prev => ({ ...prev, topicsExplored: prev.topicsExplored + 1, lastActiveDate: todayISO() }));
    addXP(25);
  }

  function startTopicActivity(topic: string) {
    // Every open (not just the first) moves this topic to the front of
    // "Continue Learning".
    const openedAt = new Date().toISOString();
    touchActivity(topic, prev => ({ ...prev, lastOpenedAt: openedAt }));
    // Rapid/synchronous repeat calls for the same topic (e.g. two effects
    // firing before React re-renders) must only count once. A closure check
    // against `stats` (render-time snapshot) isn't enough — two calls in the
    // same tick both see the same stale snapshot and both think the topic is
    // new. startedTopicsRef is mutated synchronously as the primary guard;
    // the check against `prev` inside the setStats updater is a second,
    // belt-and-suspenders guard against any other source of duplicate calls
    // (e.g. a stats reconciliation racing in between).
    // No XP here: startedTopics isn't persisted server-side yet, so it resets on
    // every reload and an XP award would repeat each time the topic is reopened.
    if (startedTopicsRef.current.has(topic) || stats.completedTopics.includes(topic)) {
      setStats(prev => ({ ...prev, lastActiveDate: todayISO() }));
      return;
    }
    startedTopicsRef.current.add(topic);
    setStats(prev => {
      if (prev.startedTopics.includes(topic) || prev.completedTopics.includes(topic)) {
        return { ...prev, lastActiveDate: todayISO() };
      }
      return {
        ...prev,
        startedTopics:  [...prev.startedTopics, topic],
        topicsExplored: prev.topicsExplored + 1,
        lastActiveDate: todayISO(),
      };
    });
  }

  function completeLesson(topic: string, subject?: string, grade?: string, curriculum?: string) {
    // Call server to record completion
    fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/complete-lesson`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ topic, subject, grade, curriculum }),
    })
      // A server error (400/500) still returns valid JSON — without this check,
      // r.json() resolves "successfully" with an { error } body, which used to
      // get merged straight into stats (leaving completedTopics untouched) and
      // never reach the offline-fallback catch below. That's how a student could
      // pass a quiz, see XP awarded, but the topic never actually marks as done.
      .then(r => { if (!r.ok) throw new Error('complete-lesson failed'); return r.json(); })
      .then(data => setStats(prev => ({ ...prev, ...data })))
      .catch(() => {
        // Offline fallback
        setStats(prev => {
          const already = prev.completedTopics.includes(topic);
          const newXP = already ? prev.xpPoints : prev.xpPoints + 150;
          return {
            ...prev,
            completedTopics: already ? prev.completedTopics : [...prev.completedTopics, topic],
            xpPoints:        newXP,
            level:           computeLevel(newXP),
            todayXP:         already ? prev.todayXP : prev.todayXP + 150,
            topicsExplored:  already ? prev.topicsExplored : prev.topicsExplored + 1,
            lastLesson:      topic,
            lastActiveDate:  todayISO(),
          };
        });
      });
  }

  function completeChallenge(xpAwarded: number = 100) {
    setStats(prev => {
      const newXP = prev.xpPoints + xpAwarded;
      return {
        ...prev,
        challengesCompleted: prev.challengesCompleted + 1,
        xpPoints:            newXP,
        level:               computeLevel(newXP),
        todayXP:             prev.todayXP + xpAwarded,
        lastActiveDate:      todayISO(),
      };
    });
  }

  function completeAssignment() {
    setStats(prev => ({ ...prev, assignmentsDone: prev.assignmentsDone + 1, lastActiveDate: todayISO() }));
    addXP(75);
  }

  return (
    <StudentDataContext.Provider value={{ stats, studentId, statsLoadError, refreshStats, addXP, exploreTopic, startTopicActivity, completeLesson, completeChallenge, completeAssignment, recordStudyTime, recordStudySeconds, learningActivity, recordQuizResult }}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  return useContext(StudentDataContext);
}

// ─────────────────────────────────────────────────────────
// Display Helpers
// ─────────────────────────────────────────────────────────

export function formatStudyTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatLevel(level: number): string {
  return `Lvl ${String(level).padStart(2, '0')}`;
}

export function xpForNextLevel(xp: number): { current: number; needed: number; level: number } {
  let level = 1, threshold = 500, total = 0;
  while (xp >= total + threshold) { total += threshold; threshold += 250; level++; }
  return { current: xp - total, needed: threshold, level };
}
