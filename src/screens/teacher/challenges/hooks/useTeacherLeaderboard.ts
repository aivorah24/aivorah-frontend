import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LeaderEntry, fetchClassLeaderboard, fetchStudentWeekly } from '../services/teacherChallengesService';
import { LeaderboardPeriod, daysLeftInPeriod } from '../utils/leaderboardPeriod';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const norm = (s?: string) => (s ?? '').toLowerCase().replace(/\s+/g, '');

export interface LeaderboardFilterState {
  period: LeaderboardPeriod;
  customDate: string;   // 'YYYY-MM-DD', used when period === 'custom'
  classGrade: string;   // '' = every grade the teacher teaches ("By XP")
}

export function useTeacherLeaderboard(
  activeTab: 'challenges' | 'leaderboard',
  teacherEmail: string | undefined,
  userName: string | undefined,
  { period, customDate, classGrade }: LeaderboardFilterState,
) {
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lbLoading, setLbLoading]     = useState(false);
  const [rankChange, setRankChange]   = useState<Record<string, number>>({});
  const [weekly, setWeekly]           = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Fetch leaderboard — scoped to THIS teacher's class (same school +
  // curriculum + the grades they teach) via teacherEmail, then narrowed by
  // the selected period and grade.
  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    if (!teacherEmail) return;
    if (period === 'custom' && !customDate) return;
    // A slower response for an earlier filter must not overwrite the current one.
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the leaderboard fetch, not derivable from render-time values
    setLbLoading(true);
    fetchClassLeaderboard(teacherEmail, { period, date: customDate, classGrade })
      .then(data => {
        if (cancelled) return;
        setLeaderboard(data);
        // Rank movement vs. the previously seen snapshot of the SAME filter
        // (self-contained, no backend history needed) — positive = climbed,
        // negative = dropped. Comparing a "today" rank with a "this month"
        // rank would be meaningless, so each filter keeps its own snapshot.
        const key = `lb_prev_ranks:${period}:${period === 'custom' ? customDate : ''}:${classGrade}`;
        AsyncStorage.getItem(key).then(raw => {
          if (cancelled) return;
          const prev = raw ? JSON.parse(raw) : {};
          const changes: Record<string, number> = {};
          data.forEach((e: LeaderEntry) => {
            if (prev[e.id] != null) changes[e.id] = prev[e.id] - e.rank;
          });
          setRankChange(changes);
          const now: Record<string, number> = {};
          data.forEach((e: LeaderEntry) => { now[e.id] = e.rank; });
          AsyncStorage.setItem(key, JSON.stringify(now)).catch(() => {});
        }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLbLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, teacherEmail, period, customDate, classGrade]);

  const totalXP = useMemo(() => leaderboard.reduce((a, e) => a + (e.score || 0), 0), [leaderboard]);
  const activeStudents = useMemo(() => leaderboard.filter(e => (e.score || 0) > 0).length, [leaderboard]);
  const yourEntry = useMemo(
    () => leaderboard.find(e => norm(e.name) === norm(userName)) || null,
    [leaderboard, userName],
  );
  const yourAbove = useMemo(
    () => (yourEntry ? leaderboard.find(e => e.rank === yourEntry.rank - 1) || null : null),
    [leaderboard, yourEntry],
  );
  // Only meaningful for a period that is still running.
  const daysLeft = useMemo(
    () => (period === 'week' || period === 'month' ? daysLeftInPeriod(period) : null),
    [period],
  );

  // Weekly activity for the logged-in user (if they appear in the leaderboard).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets weekly state when the selected entry changes, external sync
    if (!yourEntry?.id) { setWeekly([0, 0, 0, 0, 0, 0, 0]); return; }
    fetchStudentWeekly(yourEntry.id)
      .then(res => {
        if (res?.days) {
          const m: Record<string, number> = {};
          res.days.forEach((d: any) => { m[d.day] = d.xp || 0; });
          setWeekly(WEEK_DAYS.map(d => m[d] ?? 0));
        }
      })
      .catch(() => {});
  }, [yourEntry?.id]);

  return { leaderboard, lbLoading, rankChange, weekly, totalXP, activeStudents, yourEntry, yourAbove, daysLeft };
}
