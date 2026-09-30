import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// A number that goes up whenever the student comes back to this screen (the navigator keeps screens alive) or back
// to the browser tab, so data such as the teacher's latest published changes is fetched again.
export function useRefreshOnFocus(navigation: any) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const unsubscribe = typeof navigation?.addListener === 'function' ? navigation.addListener('focus', bump) : undefined;
    const onVisible = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') bump(); };
    const web = Platform.OS === 'web' && typeof window !== 'undefined';
    if (web) window.addEventListener('focus', onVisible);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (web) window.removeEventListener('focus', onVisible);
    };
  }, [navigation]);
  return tick;
}
