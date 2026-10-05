import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Practice opens only after the student has learned the topic: read Learn to the end or listened to the
// whole lesson. Remembered per student and topic so it stays unlocked on the next visit.
export function useTopicUnlock(studentKey: string | undefined, scope: string, topicName: string | undefined) {
  const key = `@lp_learned_${studentKey || 'anon'}_${scope}|${topicName || ''}`;
  const [unlockedKey, setUnlockedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key).then((v) => { if (!cancelled && v === '1') setUnlockedKey(key); }).catch(() => {});
    return () => { cancelled = true; };
  }, [key]);

  const markLearned = useCallback(() => {
    setUnlockedKey(key);
    AsyncStorage.setItem(key, '1').catch(() => {});
  }, [key]);

  return { unlocked: unlockedKey === key, markLearned };
}
