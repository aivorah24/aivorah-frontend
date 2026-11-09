import React, { Suspense, useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getNetworkQuality, onNetworkQualityChange } from '../utils/networkQuality';
import { warmServices } from '../utils/warmServices';

// Code-splitting for the role navigators. Every screen except the role's home
// screen is loaded from its own JS chunk the first time it's opened, so the
// first page load downloads and parses only what that page needs (the single
// bundle used to be ~10 MB / 2.5 MB compressed, every page of every role).
//
// Signal-aware prefetch: on a good connection (4G/5G/Wi-Fi) the navigator
// quietly downloads the rest of its role's screens one at a time once the
// browser is idle, so opening them later is instant. On 2G/3G or Data Saver
// nothing is prefetched — each screen is fetched only when opened.

type ScreenModule = { default: React.ComponentType<any> };
type Loader = () => Promise<ScreenModule>;

const RELOAD_FLAG = 'aivorah_chunk_reload';

// A chunk can fail to load on a flaky network (retry once) or because a new
// deploy replaced the old chunk files while this tab was open (reload the page
// once to pick up the new build). The sessionStorage flag stops reload loops.
function withRetry(loader: Loader): Loader {
  return () =>
    loader()
      .catch(() => new Promise<void>((r) => setTimeout(r, 800)).then(loader))
      .then((mod) => {
        try { if (Platform.OS === 'web') sessionStorage.removeItem(RELOAD_FLAG); } catch {}
        return mod;
      })
      .catch((err) => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && navigator.onLine !== false) {
          let alreadyReloaded = false;
          try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'; } catch {}
          if (!alreadyReloaded) {
            try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch {}
            window.location.reload();
            return new Promise<ScreenModule>(() => {}); // page is reloading
          }
        }
        throw err;
      });
}

// Spinner color requested for the screen-loading state (Aivorah gold).
const SPINNER_COLOR = '#B4A467';

function ScreenFallback() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDark }}>
      <ActivityIndicator testID="screen-loading" size="large" color={SPINNER_COLOR} />
    </View>
  );
}

export type LazyScreenGroup = {
  lazyScreen: (loader: Loader) => React.ComponentType<any>;
  prefetchAll: () => Promise<void>;
};

export function createLazyScreenGroup(): LazyScreenGroup {
  const loads: (() => Promise<ScreenModule>)[] = [];

  function lazyScreen(loader: Loader): React.ComponentType<any> {
    let pending: Promise<ScreenModule> | null = null;
    const load = () => {
      if (!pending) pending = withRetry(loader)().catch((err) => { pending = null; throw err; });
      return pending;
    };
    loads.push(load);
    const Lazy = React.lazy(load);
    function LazyScreen(props: any) {
      return (
        <Suspense fallback={<ScreenFallback />}>
          <Lazy {...props} />
        </Suspense>
      );
    }
    return LazyScreen;
  }

  async function prefetchAll() {
    for (const load of loads) {
      if (getNetworkQuality() === 'slow') return; // connection dropped — stop
      await idle();
      try { await load(); } catch {}
    }
  }

  return { lazyScreen, prefetchAll };
}

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = typeof window !== 'undefined' ? (window as any).requestIdleCallback : undefined;
    if (typeof ric === 'function') ric(() => resolve(), { timeout: 2000 });
    else setTimeout(resolve, 50);
  });
}

// Called once by each role navigator: wakes the services that role uses and,
// on a good connection, prefetches the role's other screens after first paint.
export function useRoleWarmup(group: LazyScreenGroup, serviceUrls: string[]) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    warmServices(serviceUrls);

    let cancelled = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (cancelled || started || getNetworkQuality() === 'slow') return;
      started = true;
      group.prefetchAll();
    };
    // Let the home screen's own requests go first.
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(start, 2500); };
    schedule();
    // Started on a slow link and it got better (e.g. back on Wi-Fi) → prefetch then.
    const unsubscribe = onNetworkQualityChange((q) => { if (q !== 'slow') schedule(); });
    return () => { cancelled = true; if (timer) clearTimeout(timer); unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per navigator mount
  }, []);
}
