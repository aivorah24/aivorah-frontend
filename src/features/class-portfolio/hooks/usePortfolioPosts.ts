import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchPosts, fetchFolders, PortfolioPost, PortfolioFolder } from '../api/classPortfolioApi';
import { useNotification } from '../../../context/NotificationContext';

export const POSTS_POLL_MS = 10000;

// Class feed with live refresh: screen focus, browser tab focus / app foreground,
// a 10s poll and any new class-post notification for this class. Background
// refreshes are silent and clear a stale error, so one failed load (e.g. a cold
// start) no longer freezes the feed until a manual reload.
export function usePortfolioPosts(grade: string, section: string, email: string) {
  const [posts, setPosts] = useState<PortfolioPost[]>([]);
  const [folders, setFolders] = useState<PortfolioFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seqRef = useRef(0);
  // Which class the shown data belongs to.
  const loadedKeyRef = useRef('');

  const refresh = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!email || !grade) return;
    const key = `${email}|${grade}|${section}`;
    const hasData = loadedKeyRef.current === key;
    // A slow older request must not overwrite a newer one (e.g. resurrect a deleted post).
    const seq = ++seqRef.current;
    if (!silent && !hasData) setLoading(true);
    try {
      const [p, f] = await Promise.all([fetchPosts(grade, section, email), fetchFolders(grade, section, email)]);
      if (seq !== seqRef.current) return;
      loadedKeyRef.current = key;
      setPosts(p);
      setFolders(f);
      setError('');
    } catch (e: any) {
      if (seq !== seqRef.current) return;
      // Keep showing the last good feed on a background failure.
      if (!hasData) setError(e?.message || 'Failed to load posts');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [email, grade, section]);

  // New class: forget the previous class's data (render-time adjustment, not an effect).
  const classKey = `${email}|${grade}|${section}`;
  const [prevClassKey, setPrevClassKey] = useState(classKey);
  if (classKey !== prevClassKey) {
    setPrevClassKey(classKey);
    setPosts([]);
    setFolders([]);
    setError('');
    setLoading(true);
  }

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    if (!email || !grade) return;
    const t = setInterval(() => void refresh({ silent: true }), POSTS_POLL_MS);
    return () => clearInterval(t);
  }, [email, grade, section, refresh]);

  // Browser tabs throttle timers while hidden; catch up as soon as the user returns.
  useEffect(() => {
    const onVisible = () => void refresh({ silent: true });
    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
      const onVis = () => { if (document.visibilityState === 'visible') onVisible(); };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('focus', onVisible);
      return () => {
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('focus', onVisible);
      };
    }
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') onVisible(); });
    return () => sub.remove();
  }, [refresh]);

  // A class-post notification for this class means the feed changed.
  const { notificationItems } = useNotification();
  const classPostKey = useMemo(
    () => notificationItems
      .filter((i) => i.type === 'portfolio' && i.grade === grade && String(i.section ?? '') === String(section ?? ''))
      .map((i) => i.id)
      .sort()
      .join(','),
    [notificationItems, grade, section],
  );
  const lastKeyRef = useRef(classPostKey);
  useEffect(() => {
    if (classPostKey === lastKeyRef.current) return;
    const grew = classPostKey.split(',').some((id) => id && !lastKeyRef.current.split(',').includes(id));
    lastKeyRef.current = classPostKey;
    if (grew) void refresh({ silent: true });
  }, [classPostKey, refresh]);

  return { posts, setPosts, folders, loading, error, refresh };
}
