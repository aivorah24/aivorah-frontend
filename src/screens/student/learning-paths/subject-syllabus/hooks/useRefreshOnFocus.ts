import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const POLL_MS = 15000;

// A number that goes up whenever the student comes back to this screen (the navigator keeps screens alive), back
// to the browser tab, and every few seconds while they are on it — so the teacher's latest published changes show
// up without a reload. Unchanged data costs a 304 and does not re-render.
export function useRefreshOnFocus(navigation: any, pollMs: number = POLL_MS) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const unsubscribe = typeof navigation?.addListener === 'function' ? navigation.addListener('focus', bump) : undefined;
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
    const onVisible = () => { if (visible()) bump(); };
    if (web) window.addEventListener('focus', onVisible);
    const onScreen = () => (typeof navigation?.isFocused === 'function' ? navigation.isFocused() : true);
    const timer = navigation && pollMs > 0 ? setInterval(() => { if (visible() && onScreen()) bump(); }, pollMs) : undefined;
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (web) window.removeEventListener('focus', onVisible);
      if (timer) clearInterval(timer);
    };
  }, [navigation, pollMs]);
  return tick;
}
