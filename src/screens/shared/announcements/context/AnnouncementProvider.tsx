import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import { useNotification } from '../../../../context/NotificationContext';
import { fetchActiveAnnouncements, dismissAnnouncement } from '../services/announcementsApi';
import { Announcement } from '../types';

interface AnnouncementState {
  bannerAnnouncements: Announcement[];
  dismiss: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AnnouncementContext = createContext<AnnouncementState>({
  bannerAnnouncements: [],
  dismiss: async () => {},
  refresh: async () => {},
});

// Announcements change rarely (an admin publishing a notice), unlike messages —
// no need for the 8s message-poll cadence. Foreground refresh covers the common
// case of "app was backgrounded, something new got published" instantly.
const POLL_INTERVAL_MS = 90000;

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { toastItem } = useNotification();
  const [bannerAnnouncements, setBannerAnnouncements] = useState<Announcement[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActive = useCallback(async () => {
    if (!isAuthenticated || !user?.email) {
      setBannerAnnouncements([]);
      return;
    }
    try {
      const data = await fetchActiveAnnouncements(user.email, 'banner');
      setBannerAnnouncements(data);
    } catch (err) {
      // Server-side failure or network error — logged, but the app keeps
      // working and simply keeps showing whatever was last fetched rather
      // than crashing or clearing on a blip.
      console.warn('[AnnouncementProvider] fetch error:', err);
    }
  }, [isAuthenticated, user]);

  const dismiss = useCallback(async (id: string) => {
    // Optimistic: remove immediately, don't wait on the network.
    setBannerAnnouncements((prev) => prev.filter((a) => a.id !== id));
    if (!user?.email) return;
    try {
      await dismissAnnouncement(id, user.email);
    } catch (err) {
      console.warn('[AnnouncementProvider] dismiss failed:', err);
      // Not re-added on failure — worst case it reappears on next poll/login,
      // which is a safe direction to fail in (never stuck permanently dismissed
      // from a local action that didn't actually persist).
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the poll/subscription below; fetchActive's sync early-return branch resets state, external sync
    fetchActive();

    pollRef.current = setInterval(fetchActive, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') fetchActive();
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
  }, [fetchActive]);

  // A new announcement just reached the bell (8s poll) — show its banner now, not on the next 90s poll.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch triggered by an external notification, external sync
    if (toastItem?.type === 'announcement') void fetchActive();
  }, [toastItem, fetchActive]);

  return (
    <AnnouncementContext.Provider value={{ bannerAnnouncements, dismiss, refresh: fetchActive }}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncements() {
  return useContext(AnnouncementContext);
}
