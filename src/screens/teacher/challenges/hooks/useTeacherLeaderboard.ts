import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LeaderEntry, fetchClassLeaderboard, fetchStudentWeekly } from '../services/teacherChallengesService';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const norm = (s?: string) => (s ?? '').toLowerCase().replace(/\s+/g, '');

export function useTeacherLeaderboard(activeTab: 'challenges' | 'leaderboard', teacherEmail: string | undefined, userName: string | undefined) {
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [lbLoading, setLbLoading]     = useState(false);
  const [rankChange, setRankChange]   = useState<Record<string, number>>({});
  const [weekly, setWeekly]           = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Fetch leaderboard — scoped to THIS teacher's class (same school +
  // curriculum + the grades they teach) via teacherEmail.
  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    if (!teacherEmail) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the leaderboard fetch, not derivable from render-time values
    setLbLoading(true);
    fetchClassLeaderboard(teacherEmail)
      .then(data => {
        setLeaderboard(data);
        // Rank movement vs. the previously seen snapshot (self-contained, no
        // backend history needed) — positive = climbed, negative = dropped.
        AsyncStorage.getItem('lb_prev_ranks').then(raw => {
          const prev = raw ? JSON.parse(raw) : {};
          const changes: Record<string, number> = {};
          data.forEach((e: LeaderEntry) => {
            if (prev[e.id] != null) changes[e.id] = prev[e.id] - e.rank;
          });
          setRankChange(changes);
          const now: Record<string, number> = {};
          data.forEach((e: LeaderEntry) => { now[e.id] = e.rank; });
          AsyncStorage.setItem('lb_prev_ranks', JSON.stringify(now)).catch(() => {});
        }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLbLoading(false));
  }, [activeTab, teacherEmail]);

  const totalXP = useMemo(() => leaderboard.reduce((a, e) => a + (e.score || 0), 0), [leaderboard]);
  const yourEntry = useMemo(
    () => leaderboard.find(e => norm(e.name) === norm(userName)) || null,
    [leaderboard, userName],
  );
  const yourAbove = useMemo(
    () => (yourEntry ? leaderboard.find(e => e.rank === yourEntry.rank - 1) || null : null),
    [leaderboard, yourEntry],
  );
  const daysLeft = useMemo(() => { const d = new Date().getDay(); return d === 0 ? 1 : 8 - d; }, []);
  const showPodium = leaderboard.length >= 3;

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

  return { leaderboard, lbLoading, rankChange, weekly, totalXP, yourEntry, yourAbove, daysLeft, showPodium };
}
