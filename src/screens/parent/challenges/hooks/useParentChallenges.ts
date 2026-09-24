import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../../context/AuthContext';
import {
  fetchChildren, fetchChildStats, fetchChallenges as fetchChallengesApi,
  Child, Challenge,
} from '../services/parentChallengesService';

export function useParentChallenges() {
  const { user } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [childStats, setChildStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  // Which child the loaded list belongs to (deep links must not open a sibling's copy).
  const [challengesChildId, setChallengesChildId] = useState<string | null>(null);
  const [loadingCh, setLoadingCh] = useState(false);

  // Fetch children on every focus so a newly added child appears instantly.
  useFocusEffect(useCallback(() => {
    if (!user?.email) return;
    fetchChildren(user.email).then(data => { if (data.length > 0) setChildren(data); }).catch(() => {});
  }, [user]));

  const child = children[selectedIdx] ?? null;

  const loadStats = useCallback((showSpinner = false) => {
    if (!child?.id) return;
    if (showSpinner) setLoadingStats(true);
    fetchChildStats(child.id)
      .then(data => setChildStats(data))
      .catch(() => {})
      .finally(() => { if (showSpinner) setLoadingStats(false); });
  }, [child]);

  // Triggers a new fetch (with spinner) exactly when the selected child
  // changes — not derivable from render-time values alone.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadStats(true); }, [child?.id]);

  const loadChallenges = useCallback((showSpinner = false) => {
    if (!child?.grade || !user?.email) return;
    if (showSpinner) setLoadingCh(true);
    const forChild = child.id;
    fetchChallengesApi(child, user.email)
      .then(data => { setChallenges(data); setChallengesChildId(forChild); })
      .catch(() => {})
      .finally(() => { if (showSpinner) setLoadingCh(false); });
  }, [child?.id, child?.grade, user?.email]);

  // Same as above: triggers a new fetch (with spinner) when loadChallenges'
  // identity changes (child/grade/email changed).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadChallenges(true); }, [loadChallenges]);

  // Reload on focus + poll every 30s while screen is visible. showSpinner=false
  // for background refreshes so the already-loaded list doesn't blank back to
  // a spinner (matches the student ChallengesScreen fix for the same bug).
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useFocusEffect(useCallback(() => {
    loadChallenges();
    loadStats();
    intervalRef.current = setInterval(() => { loadChallenges(); loadStats(); }, 30000);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [loadChallenges, loadStats]));

  // Group challenges by whatever `category` the API actually returns
  // (e.g. "Pattern Challenge", "Real-World Application") instead of a fixed
  // set of `type` strings — the challenge type taxonomy has grown since the
  // three-section layout was designed, and a hardcoded filter silently drops
  // any challenge whose type isn't one of the original three (bug found via
  // live E2E: zero challenges rendered because none of the seeded data
  // matches 'school_challenge'/'olympiad'/'advanced_practice' anymore).
  const challengeGroups: { key: string; label: string; items: Challenge[] }[] = [];
  for (const c of challenges) {
    const key = c.category || c.type || 'Other';
    let group = challengeGroups.find(g => g.key === key);
    if (!group) { group = { key, label: key, items: [] }; challengeGroups.push(group); }
    group.items.push(c);
  }

  return {
    children, selectedIdx, setSelectedIdx, child,
    childStats, loadingStats,
    challenges, loadingCh, challengesChildId,
    challengeGroups,
    refresh: () => { loadChallenges(); loadStats(); },
  };
}
