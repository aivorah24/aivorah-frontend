import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import SERVER_URL from '../../../../config/challengesServerUrl';
import { fetchWithRetry } from '../../../../utils/fetchWithRetry';
import type { Challenge } from '../types';

// Started by the student from Available, not given by a teacher/parent.
const isSelfStarted = (c: Challenge) => c.assignedByRole === 'student';

export function useChallengesList({
  grade,
  curriculum,
  studentId,
  initialTab,
  refreshProfile,
}: {
  grade: string;
  curriculum: string;
  studentId: string | undefined;
  initialTab: 'assigned' | undefined;
  refreshProfile: () => Promise<any>;
}) {
  const [activeTab, setActiveTab] = useState(initialTab === 'assigned' ? 'Assigned' : 'Available');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Re-sync the tab when initialTab changes — adjusted during render (React's
  // documented "adjusting state when a prop changes" pattern) instead of an effect.
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab === 'assigned') setActiveTab('Assigned');
  }

  const fetchChallenges = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // Bug #22 ("no challenges available"): this used to be a bare
      // single-attempt fetch() — the same intermittent network flakiness
      // already proven and fixed this session for the Progress page and AI
      // Coach suggestions (both now on fetchWithRetry) meant any one
      // transient blip permanently showed an empty state, even though real
      // challenges existed.
      const url = `${SERVER_URL}/challenges?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(curriculum)}${studentId ? `&studentId=${studentId}` : ''}`;
      const [res, assignedRes] = await Promise.all([
        fetchWithRetry(url),
        studentId ? fetchWithRetry(`${SERVER_URL}/challenges/assigned?studentId=${studentId}`) : Promise.resolve(null),
      ]);
      if (res.ok) {
        const data: Challenge[] = await res.json();
        if (Array.isArray(data)) {
          // Merge parent-assigned challenges from other grades that won't appear in grade-filtered list
          let merged = [...data];
          if (assignedRes?.ok) {
            const assigned: Challenge[] = await assignedRes.json();
            for (const a of assigned) {
              if (!merged.find(c => c.id === a.id)) {
                merged.push({ ...a });
              }
            }
          }
          setChallenges(merged);
        }
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, [grade, curriculum, studentId]);

  useEffect(() => {
    // data fetching effect — setState happens inside fetchChallenges, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChallenges();
    // isRefresh=true so the periodic poll doesn't blank the list back to the
    // full-screen spinner every 30s (that was the "challenge blinking off" bug).
    const interval = setInterval(() => fetchChallenges(true), 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchChallenges]);

  useFocusEffect(useCallback(() => {
    refreshProfile().catch(() => {});
    // Same reasoning — refocusing the tab shouldn't blank the already-loaded list.
    fetchChallenges(true);
  }, [fetchChallenges, refreshProfile]));

  const filtered = useMemo(() => {
    if (activeTab === 'Available')  return challenges.filter(c => c.status === 'available');
    if (activeTab === 'Assigned')   return challenges.filter(c => c.status === 'assigned' && !isSelfStarted(c));
    if (activeTab === 'In Progress') return challenges.filter(c => c.status === 'assigned' && isSelfStarted(c));
    if (activeTab === 'Completed')  return challenges.filter(c => c.status === 'completed');
    return challenges;
  }, [challenges, activeTab]);

  const counts = useMemo(() => ({
    available:  challenges.filter(c => c.status === 'available').length,
    assigned:   challenges.filter(c => c.status === 'assigned' && !isSelfStarted(c)).length,
    inProgress: challenges.filter(c => c.status === 'assigned' && isSelfStarted(c)).length,
    completed:  challenges.filter(c => c.status === 'completed').length,
  }), [challenges]);

  return {
    activeTab, setActiveTab,
    challenges, setChallenges,
    loading, refreshing,
    fetchChallenges,
    filtered, counts,
  };
}
