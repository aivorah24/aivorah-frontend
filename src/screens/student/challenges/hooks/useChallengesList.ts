import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import SERVER_URL from '../../../../config/challengesServerUrl';
import type { Challenge } from '../types';

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
      const url = `${SERVER_URL}/challenges?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(curriculum)}${studentId ? `&studentId=${studentId}` : ''}`;
      const [res, assignedRes] = await Promise.all([
        fetch(url),
        studentId ? fetch(`${SERVER_URL}/challenges/assigned?studentId=${studentId}`) : Promise.resolve(null),
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
    if (activeTab === 'Assigned')   return challenges.filter(c => c.status === 'assigned');
    if (activeTab === 'Completed')  return challenges.filter(c => c.status === 'completed');
    return challenges;
  }, [challenges, activeTab]);

  const counts = useMemo(() => ({
    available:  challenges.filter(c => c.status === 'available').length,
    assigned:   challenges.filter(c => c.status === 'assigned').length,
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
