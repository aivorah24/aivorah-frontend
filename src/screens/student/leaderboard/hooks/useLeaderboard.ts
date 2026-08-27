import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';
import { LeaderboardEntry, Scope } from '../types';

export function useLeaderboard(
  tab: Scope,
  myGrade: string | undefined,
  mySchool: string | undefined,
  myCurriculum: string | undefined
) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const enc = encodeURIComponent;
      let params = '?limit=500';
      if (tab === 'school') { if (mySchool) params += `&school=${enc(mySchool)}`; }
      else if (tab === 'grade') { if (myGrade) params += `&grade=${enc(myGrade)}`; if (mySchool) params += `&school=${enc(mySchool)}`; }
      else if (tab === 'curriculum') { if (myCurriculum) params += `&curriculum=${enc(myCurriculum)}`; }
      
      const data = await fetch(`${LEADERBOARD_SERVICE_URL}/student/leaderboard${params}`).then(r => r.json());
      if (Array.isArray(data)) setLeaderboard(data);
    } catch { 
      /* ignore */ 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  }, [tab, myGrade, mySchool, myCurriculum]);

  useEffect(() => {
    // data fetching effect — setState happens inside fetchLeaderboard, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useFocusEffect(
    useCallback(() => { 
      fetchLeaderboard(true); 
    }, [fetchLeaderboard])
  );

  return {
    leaderboard,
    loading,
    refreshing,
    fetchLeaderboard
  };
}
