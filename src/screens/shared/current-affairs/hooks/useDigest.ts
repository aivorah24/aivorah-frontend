import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../../context/AuthContext';
import {
  fetchTodayDigest, fetchProgress, recordDigestComplete,
  type AgeGroup, type Digest, type Progress,
} from '../../../../services/currentAffairsApi';
import { ageGroupForGrade } from '../constants';

export type DigestState = ReturnType<typeof useDigest>;

// Today's digest + the student's progress, reloaded every time the screen
// showing it gets focus (so stories read in StoryScreen show as checked).
// Used by the Current Affairs page and The World & You's Current Affairs tab.
export function useDigest() {
  const { user } = useAuth();
  const email = user?.email || undefined;
  const ageGroup: AgeGroup = ageGroupForGrade(user?.grade);

  const [digest, setDigest] = useState<Digest | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'retry' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'retry') setLoading(true);
    setError(null);
    try {
      const [d, p] = await Promise.all([
        fetchTodayDigest(ageGroup, email),
        // Progress is a nice-to-have: the stories still show if it fails.
        email ? fetchProgress(email, ageGroup).catch(() => null) : Promise.resolve(null),
      ]);
      setDigest(d);
      if (p) setProgress(p);
    } catch (e: any) {
      setError(e?.message || "Could not load today's stories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ageGroup, email]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const complete = useCallback(async () => {
    if (!email || !digest) return;
    setCompleting(true);
    setCompleteMessage(null);
    try {
      const result = await recordDigestComplete(email, ageGroup, digest.stories.length);
      setProgress(result.progress);
      setDigest({ ...digest, completed: true });
      setCompleteMessage(result.alreadyCompleted
        ? "You already finished today's digest."
        : `Well done! +${result.pointsAwarded} points${result.newBadges.includes('weekly_streak') ? ' and a 7-day streak badge!' : ''}`);
    } catch (e: any) {
      setCompleteMessage(e?.message || 'Could not save your progress');
    } finally {
      setCompleting(false);
    }
  }, [email, ageGroup, digest]);

  return {
    email, ageGroup, digest, progress, loading, refreshing, error, completing, completeMessage, load, complete,
  };
}
