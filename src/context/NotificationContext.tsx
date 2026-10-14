import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import PROFILE_SERVER_URL from '../config/profileServerUrl';
import MESSAGES_SERVER_URL from '../config/messagesServerUrl';
import SCHOOL_ADMIN_SERVER_URL from '../config/schoolAdminServerUrl';
import {
  V2Notification, NotificationsUnavailableError,
  fetchNotifications, fetchUnreadCount, markNotificationRead as apiMarkRead, markAllNotificationsRead,
} from '../services/notificationsApi';
import { NotifItem, CategoryPrefs, toNotifItem, isAssignmentType, isEventType, isAccountType, isClassPostType, isAnnouncementType, isV2OwnedLegacy, isV2Allowed } from './notifItem';

export type { NotifItem } from './notifItem';
export { toNotifItem } from './notifItem';

declare const __DEV__: boolean;

interface LatestNotif {
  id: string;
  senderName: string;
  senderEmail: string;
  preview: string;
  createdAt: string;
}

export type FeedStatus = 'loading' | 'ready' | 'error';

interface NotificationState {
  unreadCount: number;
  unreadAssignments: number;
  unreadChallenges: number;
  unreadEvents: number;
  unreadAccount: number;
  unreadJoinRequests: number; // pending B2C→B2B school-join requests (school-admin only)
  latestNotif: LatestNotif | null;
  notificationItems: NotifItem[]; // newest first, includes the latest unread chat message
  toastItem: NotifItem | null;    // the item that triggered the current toast
  toastVisible: boolean;
  dismissToast: () => void;
  clearUnread: () => Promise<void>;
  clearUnreadAssignments: () => Promise<void>;
  clearUnreadChallenges: () => Promise<void>;
  clearUnreadEvents: () => Promise<void>;
  refresh: () => Promise<void>;
  triggerPoll: () => void;
  muteCategory: (key: 'assignmentAlerts' | 'challengeUpdates') => void;
  notificationsV2Active: boolean;
  feedStatus: FeedStatus;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationState>({
  unreadCount: 0,
  unreadAssignments: 0,
  unreadChallenges: 0,
  unreadEvents: 0,
  unreadAccount: 0,
  unreadJoinRequests: 0,
  latestNotif: null,
  notificationItems: [],
  toastItem: null,
  toastVisible: false,
  dismissToast: () => {},
  clearUnread: async () => {},
  clearUnreadAssignments: async () => {},
  clearUnreadChallenges: async () => {},
  clearUnreadEvents: async () => {},
  refresh: async () => {},
  triggerPoll: () => {},
  muteCategory: () => {},
  notificationsV2Active: false,
  feedStatus: 'loading',
  hasMore: false,
  loadingMore: false,
  loadMore: async () => {},
  markNotificationRead: async () => {},
  markAllRead: async () => {},
});

const NOTIFICATIONS_V2_ENABLED = process.env.EXPO_PUBLIC_NOTIFICATIONS_V2 !== 'false';
// The bell is an active tray: it lists only unread V2 rows, so opening one (or the
// services clearing it on completion) removes it.
const V2_PAGE_SIZE = 20;
const V2_UNREAD_SCAN = 50;

function mergeById(first: V2Notification[], rest: V2Notification[]) {
  const seen = new Set(first.map(n => n.id));
  return [...first, ...rest.filter(n => !seen.has(n.id))];
}

type V2Poll =
  | { kind: 'ok'; page: V2Notification[]; nextCursor: string | null; unread: V2Notification[]; unreadTotal: number }
  | { kind: 'unavailable' }
  | { kind: 'error' };

async function pollV2(): Promise<V2Poll> {
  try {
    const [page, unreadPage, unreadTotal] = await Promise.all([
      fetchNotifications({ limit: V2_PAGE_SIZE, unreadOnly: true }),
      fetchNotifications({ limit: V2_UNREAD_SCAN, unreadOnly: true }),
      fetchUnreadCount(),
    ]);
    return { kind: 'ok', page: page.items, nextCursor: page.nextCursor, unread: unreadPage.items, unreadTotal };
  } catch (err) {
    return err instanceof NotificationsUnavailableError ? { kind: 'unavailable' } : { kind: 'error' };
  }
}

const POLL_INTERVAL_MS  = 8000; // 8s — was 15s; push notifications don't exist on web (see
// pushNotifications.ts), so this poll is the ONLY way the web app learns about a new
// challenge/assignment — 15s made that delay noticeable ("challenge notification is slow").
const TOAST_AUTO_HIDE_MS = 5000;
const STALE_GUARD_MS    = 5000;

// ── Notification chime (Web Audio API — two-tone pleasant bell) ──────────────
// A fresh `new AudioContext()` per chime was the cause of a perceptible sound
// delay: the browser spins up the audio hardware/thread from scratch each
// time (100-300ms+, worse on the very first chime of a session), and old
// contexts were never closed, so they piled up and made things slower over
// time. Create the context once and reuse it for every chime instead.
let sharedAudioCtx: any = null;
function getAudioCtx() {
  if (Platform.OS !== 'web') return null;
  if (sharedAudioCtx) return sharedAudioCtx;
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  sharedAudioCtx = new AudioCtx();
  return sharedAudioCtx;
}

function playNotificationSound() {
  if (Platform.OS !== 'web') return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    function tone(freq: number, startAt: number, duration: number, vol: number) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
      gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    }

    // Pleasant two-note chime: D5 → A5
    tone(587, 0,    0.45, 0.18);
    tone(880, 0.18, 0.55, 0.14);
  } catch (_) {}
}

function normalizeLatest(raw: any): LatestNotif | null {
  if (!raw || typeof raw !== 'object') return null;
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : '';
  if (!Date.parse(createdAt)) return null;
  return {
    id:          typeof raw.id === 'string'          ? raw.id          : '',
    senderName:  typeof raw.senderName === 'string'  ? raw.senderName.trim() || 'Someone' : 'Someone',
    senderEmail: typeof raw.senderEmail === 'string' ? raw.senderEmail.trim().toLowerCase() : '',
    preview:     typeof raw.preview === 'string'     ? raw.preview.trim() : '',
    createdAt:   new Date(Date.parse(createdAt)).toISOString(),
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, applyAccountUpdate } = useAuth();
  const applyAccountUpdateRef = useRef(applyAccountUpdate);
  useEffect(() => { applyAccountUpdateRef.current = applyAccountUpdate; }, [applyAccountUpdate]);

  const [unreadCount,       setUnreadCount]       = useState(0);
  const [unreadAssignments, setUnreadAssignments] = useState(0);
  const [unreadChallenges,  setUnreadChallenges]  = useState(0);
  const [unreadEvents,      setUnreadEvents]      = useState(0);
  const [unreadAccount,     setUnreadAccount]     = useState(0);
  const [unreadJoinRequests, setUnreadJoinRequests] = useState(0);
  const [latestNotif,       setLatestNotif]       = useState<LatestNotif | null>(null);
  // Legacy-derived items (whole feed in legacy mode; message/event/task/portfolio only in V2 mode).
  const [legacyItems,       setLegacyItems]       = useState<NotifItem[]>([]);
  const [toastVisible,      setToastVisible]      = useState(false);
  const [toastItem,         setToastItem]         = useState<NotifItem | null>(null);

  // V2: first page is refreshed every poll; older pages come from loadMore().
  const [v2Active,      setV2Active]      = useState(false);
  const [v2FirstPage,   setV2FirstPage]   = useState<V2Notification[]>([]);
  const [v2Older,       setV2Older]       = useState<V2Notification[]>([]);
  const [v2Cursor,      setV2Cursor]      = useState<string | null>(null);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [feedStatus,    setFeedStatus]    = useState<FeedStatus>('loading');
  const v2ModeRef       = useRef<'unknown' | 'on' | 'unavailable'>(NOTIFICATIONS_V2_ENABLED ? 'unknown' : 'unavailable');
  const v2SeenIdsRef    = useRef<Set<string>>(new Set());
  const v2BaselineRef   = useRef(false);
  const v2OlderLoadedRef = useRef(false);
  const lastV2Ref       = useRef<Extract<V2Poll, { kind: 'ok' }> | null>(null);
  // Optimistic reads survive a poll that raced the POST. The ref serves the poll
  // callback; the state copy drives rendering.
  const locallyReadRef  = useRef<Map<string, string>>(new Map());
  const [localReads,    setLocalReads]    = useState<Map<string, string>>(new Map());
  const syncLocalReads  = () => setLocalReads(new Map(locallyReadRef.current));
  // Category toggles as of the last poll (or muteCategory), so V2 rows honour them in the bell.
  const [catPrefs,      setCatPrefs]      = useState<CategoryPrefs>({ assign: true, challenge: true });

  const notificationItems = useMemo(() => {
    if (!v2Active) return legacyItems;
    const withLocalReads = (n: V2Notification) =>
      !n.readAt && localReads.has(n.id) ? { ...n, readAt: localReads.get(n.id)! } : n;
    const v2 = mergeById(v2FirstPage, v2Older).map(withLocalReads)
      .filter(n => !n.readAt && isV2Allowed(n, catPrefs)).map(toNotifItem);
    const others = legacyItems.filter(i => !isV2OwnedLegacy(i));
    const ts = (i: NotifItem) => Date.parse(i.createdAt) || 0;
    return [...v2, ...others].sort((a, b) => ts(b) - ts(a) || (b.id < a.id ? -1 : 1));
  }, [v2Active, v2FirstPage, v2Older, legacyItems, localReads, catPrefs]);

  const prevMsgRef       = useRef(0);
  const prevAssignRef    = useRef(0);
  const prevChallengeRef = useRef(0);
  const prevEventRef     = useRef(0);
  // False until the first poll after mount/login completes. The first poll only
  // records the current counts as a baseline — it must NOT chime/toast, otherwise
  // every page refresh re-alerts for notifications that already existed.
  const hasBaselineRef   = useRef(false);
  // Newest createdAt seen so far — anything newer is what "just arrived".
  const watermarkRef     = useRef(0);
  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIdRef        = useRef(0);
  const markReadInFlight = useRef(false);
  const staleGuardUntil  = useRef(0);
  const markReadCutoff   = useRef<number | null>(null);

  const poll = useCallback(
    async ({ reason = 'interval', allowDuringMarkRead = false, silent = false }: { reason?: string; allowDuringMarkRead?: boolean; silent?: boolean } = {}) => {
      if (!user?.email) return;
      if (markReadInFlight.current && !allowDuringMarkRead) return;

      const id = ++pollIdRef.current;
      const v2Promise = v2ModeRef.current !== 'unavailable' ? pollV2() : null;

      // Build the since param from AsyncStorage for assignments/challenges
      let since: string | null = null;
      try {
        since = await AsyncStorage.getItem(`assignmentSeenAt_v2_${user.email}`);
        if (!since) {
          // Default to 7 days ago so past-week assignments are visible on first load
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          since = sevenDaysAgo.toISOString();
          await AsyncStorage.setItem(`assignmentSeenAt_v2_${user.email}`, since);
        }
      } catch (_) {}

      // Separate "seen" baseline for challenges so turning Challenge Updates ON
      // dismisses only the challenge backlog (and assignments their own).
      let challengeSince: string | null = null;
      try { challengeSince = await AsyncStorage.getItem(`challengeSeenAt_v2_${user.email}`); } catch (_) {}

      // Separate "seen" baseline for schedule events.
      let eventSince: string | null = null;
      try { eventSince = await AsyncStorage.getItem(`eventSeenAt_v2_${user.email}`); } catch (_) {}

      const params = new URLSearchParams({ userEmail: user.email });
      if (since) params.set('since', since);
      if (challengeSince) params.set('challengeSince', challengeSince);
      if (eventSince) params.set('eventSince', eventSince);

      let res: Response;
      try {
        res = await fetch(`${MESSAGES_SERVER_URL}/messages/notifications-summary?${params}`);
      } catch (err) {
        if (__DEV__) console.warn('[NotifCtx] fetch failed:', err);
        if (id === pollIdRef.current) setFeedStatus('error');
        return;
      }

      if (id !== pollIdRef.current) return; // stale
      if (!res.ok) { if (__DEV__) console.warn('[NotifCtx] non-ok response:', res.status); setFeedStatus('error'); return; }

      let data: any;
      try { data = await res.json(); } catch { return; }
      if (id !== pollIdRef.current) return;

      const msgCount     = typeof data.messages    === 'number' && data.messages    >= 0 ? Math.floor(data.messages)    : 0;
      const assignCount  = typeof data.assignments === 'number' && data.assignments >= 0 ? Math.floor(data.assignments) : 0;
      const challengeCount = typeof data.challenges === 'number' && data.challenges >= 0 ? Math.floor(data.challenges) : 0;
      const eventCount   = typeof data.events      === 'number' && data.events      >= 0 ? Math.floor(data.events)      : 0;
      const latest       = normalizeLatest(data.latest);
      const items: NotifItem[] = Array.isArray(data.notificationItems) ? data.notificationItems : [];

      if (markReadInFlight.current && !allowDuringMarkRead) return;

      // Stale guard: ignore counts that arrived right after mark-read
      const now = Date.now();
      if (msgCount > 0 && staleGuardUntil.current > now && markReadCutoff.current != null) {
        const latestMs = latest ? Date.parse(latest.createdAt) : NaN;
        if (isNaN(latestMs) || latestMs <= markReadCutoff.current) return;
      }
      if (msgCount === 0) {
        staleGuardUntil.current = 0;
        markReadCutoff.current = null;
      }

      // Read parent notification preferences (if set)
      let notifPrefs: Record<string, boolean> = {};
      try {
        const raw = await AsyncStorage.getItem(`notifPrefs_${user.email}`);
        if (raw) notifPrefs = JSON.parse(raw);
      } catch {}
      const allowAssign    = notifPrefs.assignmentAlerts   !== false;
      const allowMsg       = notifPrefs.teacherMessages     !== false;
      const allowChallenge = notifPrefs.challengeUpdates    !== false;
      const prefsNow: CategoryPrefs = { assign: allowAssign, challenge: allowChallenge };
      setCatPrefs(p => (p.assign === allowAssign && p.challenge === allowChallenge ? p : prefsNow));

      // A challenge's due-date event follows the Challenge Updates toggle, not
      // Assignment Alerts — so count it under challenges, never under events.
      // Compute these BEFORE the chime logic so the sound/toast never fires for a
      // category that's toggled off (which produced a "blank push with sound").
      const challengeEventCount = items.filter(i => i.type === 'event' && i.srcType === 'challenge').length;
      const nonChallengeEventCount = Math.max(0, eventCount - challengeEventCount);
      const effChallengeCount = challengeCount + challengeEventCount;
      const effEventCount     = nonChallengeEventCount;

      // Only chime/toast when a count goes UP *after* the baseline is set.
      // The first poll after mount/refresh just records the baseline silently.
      const baseline = hasBaselineRef.current;
      const newMsg       = baseline && allowMsg       && !markReadInFlight.current && msgCount          > prevMsgRef.current;
      const newAssign    = baseline && allowAssign    && !markReadInFlight.current && assignCount       > prevAssignRef.current;
      const newChallenge = baseline && allowChallenge && !markReadInFlight.current && effChallengeCount > prevChallengeRef.current;
      const newEvent     = baseline && allowAssign    && !markReadInFlight.current && effEventCount     > prevEventRef.current;

      // Respect the user's notification preferences for the bell dropdown items too —
      // when Assignment Alerts / Challenge Updates are OFF, those items must NOT appear
      // in the bell at all (not just have a zeroed badge count).
      const filteredItems = items.filter(it => {
        // A challenge's due-date event follows the Challenge Updates toggle.
        const isChallengeEvent = it.type === 'event' && it.srcType === 'challenge';
        if (isChallengeEvent) return allowChallenge;
        if ((it.type === 'assignment' || it.type === 'quiz' || it.type === 'event' || it.type === 'task') && !allowAssign) return false;
        if (it.type === 'challenge' && !allowChallenge) return false;
        return true;
      });
      const feed: NotifItem[] = [...filteredItems];
      if (allowMsg && msgCount > 0 && latest) {
        feed.push({
          id: 'msg_' + latest.id, type: 'message',
          title: `Message from ${latest.senderName}`, subtitle: latest.preview,
          senderName: latest.senderName, senderEmail: latest.senderEmail, createdAt: latest.createdAt,
        });
      }
      const ts = (i: NotifItem) => Date.parse(i.createdAt) || 0;
      feed.sort((a, b) => ts(b) - ts(a));

      // ── V2: persisted challenge/assignment notifications replace the legacy ones ──
      let v2: Extract<V2Poll, { kind: 'ok' }> | null = null;
      let v2PollFailed = false;
      if (v2Promise) {
        const r = await v2Promise;
        if (id !== pollIdRef.current) return;
        if (r.kind === 'ok') {
          v2ModeRef.current = 'on';
          v2 = r;
          lastV2Ref.current = r;
        } else if (r.kind === 'unavailable') {
          v2ModeRef.current = 'unavailable';
        } else if (v2ModeRef.current === 'on') {
          v2 = lastV2Ref.current; // transient error: keep showing the last good V2 feed
          v2PollFailed = true;
        }
      }
      const v2On = !!v2;

      const legacyFreshPool = v2On ? feed.filter(i => !isV2OwnedLegacy(i)) : feed;
      let fresh = baseline && !markReadInFlight.current ? legacyFreshPool.filter(i => ts(i) > watermarkRef.current) : [];
      watermarkRef.current = Math.max(watermarkRef.current, ...feed.map(ts));

      if (v2On && !v2PollFailed) {
        const arrived = v2!.unread.filter(n => !v2SeenIdsRef.current.has(n.id) && !locallyReadRef.current.has(n.id) && isV2Allowed(n, prefsNow));
        v2!.page.forEach(n => v2SeenIdsRef.current.add(n.id));
        v2!.unread.forEach(n => v2SeenIdsRef.current.add(n.id));
        // Local reads the server no longer lists as unread are confirmed; forget them.
        const stillListed = new Set([...v2!.page, ...v2!.unread].map(n => n.id));
        [...locallyReadRef.current.keys()].forEach(id => { if (!stillListed.has(id)) locallyReadRef.current.delete(id); });
        // The first successful V2 poll only records what already exists.
        if (v2BaselineRef.current && !markReadInFlight.current && arrived.length) {
          fresh = [...arrived.map(toNotifItem), ...fresh].sort((a, b) => ts(b) - ts(a));
        }
        // A platform admin edited this account: re-read the profile once per poll.
        if (v2BaselineRef.current && arrived.some(isAccountType)) applyAccountUpdateRef.current?.()?.catch(() => {});
        v2BaselineRef.current = true;
      }

      // With V2 on, new events arrive as V2 rows or fresh legacy due reminders, both already in `fresh`.
      const countTriggers = v2On ? newMsg : (newMsg || newAssign || newChallenge || newEvent);
      if (!silent && (fresh.length > 0 || countTriggers)) {
        playNotificationSound();
        if (newMsg && latest) setLatestNotif(latest);
        setToastItem(fresh[0] ?? null);
        setToastVisible(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToastVisible(false), TOAST_AUTO_HIDE_MS);
      }

      prevMsgRef.current       = msgCount;
      prevAssignRef.current    = assignCount;
      prevChallengeRef.current = effChallengeCount;
      prevEventRef.current     = effEventCount;
      hasBaselineRef.current   = true;

      setUnreadCount(allowMsg ? msgCount : 0);
      setUnreadEvents(allowAssign ? effEventCount : 0);
      setLatestNotif(msgCount > 0 ? latest : null);
      setLegacyItems(feed);

      if (v2On) {
        // Category toggles hide V2 rows from the bell, badge and toast, like legacy.
        const stillUnread = v2!.unread.filter(n => !locallyReadRef.current.has(n.id));
        const total = Math.max(0, v2!.unreadTotal - (v2!.unread.length - stillUnread.length));
        const assignUnread = stillUnread.filter(isAssignmentType).length;
        const eventUnread = stillUnread.filter(isEventType).length;
        // Class posts and announcements have no badge category of their own; never count them as challenges.
        const classPostUnread = stillUnread.filter(n => isClassPostType(n) || isAnnouncementType(n)).length;
        const accountUnread = stillUnread.filter(isAccountType).length;
        const allowedEvents = stillUnread.filter(n => isEventType(n) && isV2Allowed(n, prefsNow)).length;
        const autoDueEvents = feed.filter(i => i.type === 'event' && !isV2OwnedLegacy(i) && i.srcType !== 'challenge').length;
        setUnreadAssignments(allowAssign ? assignUnread : 0);
        setUnreadAccount(accountUnread);
        setUnreadChallenges(allowChallenge ? Math.max(0, total - assignUnread - eventUnread - classPostUnread - accountUnread) + challengeEventCount : 0);
        setUnreadEvents(allowedEvents + (allowAssign ? autoDueEvents : 0));
        setV2FirstPage(v2!.page);
        if (!v2OlderLoadedRef.current) setV2Cursor(v2!.nextCursor);
        setV2Active(true);
      } else {
        setUnreadAssignments(allowAssign ? assignCount : 0);
        setUnreadChallenges(allowChallenge ? effChallengeCount : 0);
        setV2Active(false);
        if (msgCount === 0 && assignCount === 0 && challengeCount === 0) setToastVisible(false);
      }
      setFeedStatus(v2PollFailed ? 'error' : 'ready');

      if (__DEV__) console.debug(`[NotifCtx] poll(${reason}) → msg:${msgCount} assign:${assignCount} challenge:${challengeCount}`);
    },
    [user]
  );

  useEffect(() => {
    if (!user?.email) {
      // reset tied to the same effect that owns the polling subscription below — external sync, see react-hooks/set-state-in-effect
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0); setUnreadAssignments(0); setUnreadChallenges(0); setUnreadEvents(0); setUnreadAccount(0);
      setLatestNotif(null); setToastVisible(false);
      prevMsgRef.current = 0; prevAssignRef.current = 0; prevChallengeRef.current = 0; prevEventRef.current = 0;
      staleGuardUntil.current = 0; markReadCutoff.current = null;
      hasBaselineRef.current = false;
      watermarkRef.current = 0;
      setLegacyItems([]); setToastItem(null);
      setV2Active(false); setV2FirstPage([]); setV2Older([]); setV2Cursor(null); setFeedStatus('loading');
      v2ModeRef.current = NOTIFICATIONS_V2_ENABLED ? 'unknown' : 'unavailable';
      v2SeenIdsRef.current = new Set(); v2BaselineRef.current = false; v2OlderLoadedRef.current = false;
      lastV2Ref.current = null; locallyReadRef.current = new Map(); setLocalReads(new Map());
      return;
    }

    // Seed the bell's local pref key from the server BEFORE the first poll. The
    // toggle's visual state loads from the server preference, but the bell's
    // filtering reads AsyncStorage `notifPrefs_` — which is only written when the
    // user actively flips a switch. On a fresh session (e.g. incognito) that key
    // is empty, so a preference already set to OFF wouldn't be respected and the
    // notification would still show. Merge server prefs in (local keys still win).
    const email = user.email;
    (async () => {
      try {
        const res = await fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(email)}`);
        const serverPrefs = res.ok ? await res.json() : null;
        if (serverPrefs) {
          const NK = `notifPrefs_${email}`;
          const raw = await AsyncStorage.getItem(NK).catch(() => null);
          const local = raw ? JSON.parse(raw) : {};
          const merged = { ...local };
          for (const k of ['assignmentAlerts', 'challengeUpdates', 'teacherMessages'] as const) {
            if (merged[k] === undefined && serverPrefs[k] !== undefined) merged[k] = serverPrefs[k];
          }
          await AsyncStorage.setItem(NK, JSON.stringify(merged)).catch(() => {});
        }
      } catch {}
      void poll({ reason: 'initial', allowDuringMarkRead: true });
    })();
    pollRef.current = setInterval(() => void poll({ reason: 'interval' }), POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [user, poll]);

  // ── School-admin only: poll pending B2C→B2B join requests for the bell badge ──
  // Kept separate from the messages poll above (different endpoint + audience) so
  // it can't affect the student/parent notification path. Non-admins never poll.
  useEffect(() => {
    const role = user?.role;
    const isAdmin = role === 'school_admin' || role === 'super_admin';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tied to the polling-subscription effect below, external sync
    if (!user?.email || !isAdmin) { setUnreadJoinRequests(0); return; }
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/access-requests?adminEmail=${encodeURIComponent(user.email)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setUnreadJoinRequests(data.length);
      } catch { /* silent — badge just stays as-is */ }
    };
    fetchCount();
    const t = setInterval(fetchCount, POLL_INTERVAL_MS * 4); // 32s — requests are low-frequency
    return () => { cancelled = true; clearInterval(t); };
  }, [user?.email, user?.role]);

  const dismissToast = () => setToastVisible(false);

  const clearUnread = useCallback(async () => {
    if (!user?.email) return;
    const now = Date.now();
    markReadInFlight.current = true;
    staleGuardUntil.current  = now + STALE_GUARD_MS;
    markReadCutoff.current   = now;
    setUnreadCount(0); setLatestNotif(null); setToastVisible(false);
    setLegacyItems(items => items.filter(i => i.type !== 'message'));
    prevMsgRef.current = 0;

    let ok = false;
    try {
      const res = await fetch(`${MESSAGES_SERVER_URL}/messages/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email }),
      });
      if (res.ok) {
        ok = true;
        const data = await res.json().catch(() => ({}));
        if (typeof data?.unreadCount === 'number') {
          const n = Math.max(0, Math.floor(data.unreadCount));
          prevMsgRef.current = n;
          setUnreadCount(n);
          if (n === 0) setLatestNotif(null);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[NotifCtx] mark-read failed:', err);
    } finally {
      markReadInFlight.current = false;
      if (!ok) { staleGuardUntil.current = 0; markReadCutoff.current = null; }
    }
    await poll({ reason: 'post-mark-read', allowDuringMarkRead: true, silent: true });
  }, [poll, user]);

  const clearUnreadAssignments = useCallback(async () => {
    if (!user?.email) return;
    try {
      await AsyncStorage.setItem(`assignmentSeenAt_v2_${user.email}`, new Date().toISOString());
      setUnreadAssignments(0);
      prevAssignRef.current = 0;
      // Parents' assignment alerts are backed by unread system messages — the local
      // "seen" timestamp alone doesn't stop them recurring, so persist read state.
      // AWAIT this so the re-poll below sees the messages already marked read
      // (otherwise the backlog re-appears when turning the toggle back on).
      await fetch(`${MESSAGES_SERVER_URL}/messages/mark-system-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, kind: 'assignment' }),
      }).catch(() => {});
      // Re-poll AFTER the backlog is dismissed so the authoritative count is 0.
      await poll({ reason: 'post-clear-assignments', allowDuringMarkRead: true, silent: true });
    } catch (err) {
      if (__DEV__) console.warn('[NotifCtx] clearUnreadAssignments failed:', err);
    }
  }, [user, poll]);

  const clearUnreadChallenges = useCallback(async () => {
    if (!user?.email) return;
    try {
      await AsyncStorage.setItem(`challengeSeenAt_v2_${user.email}`, new Date().toISOString());
      setUnreadChallenges(0);
      prevChallengeRef.current = 0;
      // Same as assignments: persist parent challenge-alert read state server-side, then
      // re-poll so the dismissed backlog doesn't re-appear on the next cycle.
      await fetch(`${MESSAGES_SERVER_URL}/messages/mark-system-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, kind: 'challenge' }),
      }).catch(() => {});
      await poll({ reason: 'post-clear-challenges', allowDuringMarkRead: true, silent: true });
    } catch (err) {
      if (__DEV__) console.warn('[NotifCtx] clearUnreadChallenges failed:', err);
    }
  }, [user, poll]);

  const clearUnreadEvents = useCallback(async () => {
    if (!user?.email) return;
    try {
      await AsyncStorage.setItem(`eventSeenAt_v2_${user.email}`, new Date().toISOString());
      setUnreadEvents(0);
      prevEventRef.current = 0;
      await poll({ reason: 'post-clear-events', allowDuringMarkRead: true, silent: true });
    } catch (err) {
      if (__DEV__) console.warn('[NotifCtx] clearUnreadEvents failed:', err);
    }
  }, [user, poll]);

  const refresh = useCallback(async () => {
    await poll({ reason: 'manual-refresh', allowDuringMarkRead: true });
  }, [poll]);

  // Immediately drop already-displayed items for a category the user just turned OFF,
  // so the bell reflects the change instantly instead of waiting for the next poll.
  // (The poll itself already respects the saved preference on subsequent fetches.)
  const muteCategory = useCallback((key: 'assignmentAlerts' | 'challengeUpdates') => {
    setCatPrefs(p => (key === 'challengeUpdates' ? { ...p, challenge: false } : { ...p, assign: false }));
    if (key === 'challengeUpdates') {
      setUnreadChallenges(0);
      prevChallengeRef.current = 0;
      setLegacyItems(items => items.filter(
        i => !(i.type === 'challenge' || (i.type === 'event' && i.srcType === 'challenge'))
      ));
    } else {
      setUnreadAssignments(0);
      setUnreadEvents(0);
      prevAssignRef.current = 0;
      prevEventRef.current = 0;
      setLegacyItems(items => items.filter(
        i => !(i.type === 'assignment' || i.type === 'quiz' || i.type === 'task' || (i.type === 'event' && i.srcType !== 'challenge'))
      ));
    }
  }, []);

  // Trigger an immediate poll (e.g. after pref changes in Settings)
  const triggerPoll = useCallback(() => {
    void poll({ reason: 'prefs-changed', allowDuringMarkRead: false });
  }, [poll]);

  // Marks exactly one V2 notification read — optimistic, the next poll is the source of truth.
  const markNotificationRead = useCallback(async (id: string) => {
    const known = mergeById(v2FirstPage, v2Older).find(n => n.id === id);
    if (!known || known.readAt || locallyReadRef.current.has(id)) return;
    locallyReadRef.current.set(id, new Date().toISOString());
    if (isAssignmentType(known)) setUnreadAssignments(c => Math.max(0, c - 1));
    else if (isEventType(known)) setUnreadEvents(c => Math.max(0, c - 1));
    else if (isAccountType(known)) setUnreadAccount(c => Math.max(0, c - 1));
    else if (!isClassPostType(known) && !isAnnouncementType(known)) setUnreadChallenges(c => Math.max(0, c - 1));
    syncLocalReads();
    try {
      await apiMarkRead(id);
    } catch (err) {
      locallyReadRef.current.delete(id);
      syncLocalReads();
      if (__DEV__) console.warn('[NotifCtx] mark read failed:', err);
      void poll({ reason: 'mark-read-failed', allowDuringMarkRead: true, silent: true });
    }
  }, [v2FirstPage, v2Older, poll]);

  const markAllRead = useCallback(async () => {
    if (v2Active) {
      const now = new Date().toISOString();
      mergeById(v2FirstPage, v2Older).forEach(n => { if (!n.readAt) locallyReadRef.current.set(n.id, now); });
      setUnreadAssignments(0);
      setUnreadChallenges(0);
      setUnreadAccount(0);
      setUnreadEvents(0);
      syncLocalReads();
      await markAllNotificationsRead().catch(err => { if (__DEV__) console.warn('[NotifCtx] read-all failed:', err); });
    }
    // Legacy state is kept in sync so a fallback to the legacy feed doesn't resurrect old alerts.
    await Promise.all([clearUnread(), clearUnreadAssignments(), clearUnreadChallenges()]);
  }, [v2Active, v2FirstPage, v2Older, clearUnread, clearUnreadAssignments, clearUnreadChallenges]);

  const loadMore = useCallback(async () => {
    if (!v2Active || !v2Cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchNotifications({ cursor: v2Cursor, limit: V2_PAGE_SIZE, unreadOnly: true });
      v2OlderLoadedRef.current = true;
      page.items.forEach(n => v2SeenIdsRef.current.add(n.id));
      setV2Older(prev => mergeById(prev, page.items));
      setV2Cursor(page.nextCursor);
    } catch (err) {
      if (__DEV__) console.warn('[NotifCtx] load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [v2Active, v2Cursor, loadingMore]);

  return (
    <NotificationContext.Provider value={{
      unreadCount, unreadAssignments, unreadChallenges, unreadEvents, unreadAccount, unreadJoinRequests,
      latestNotif, notificationItems, toastItem, toastVisible,
      dismissToast, clearUnread, clearUnreadAssignments, clearUnreadChallenges, clearUnreadEvents, refresh, triggerPoll, muteCategory,
      notificationsV2Active: v2Active, feedStatus, hasMore: v2Active && !!v2Cursor, loadingMore, loadMore,
      markNotificationRead, markAllRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
