import { useCallback, useEffect, useRef, useState, MutableRefObject } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { ScheduleEvent, WeekDay } from '../types';
import { fetchEventsForDate, deleteEvent as deleteEventApi } from '../services/scheduleService';
import { dateISO } from '../utils/scheduleUtils';

export function useScheduleEvents(week: WeekDay[], userEmail: string | undefined, firstLoadDoneRef: MutableRefObject<boolean>) {
  const [eventsMap, setEventsMap] = useState<Record<string, ScheduleEvent[]>>({});
  const [loading, setLoading] = useState(false);
  const [nowTime, setNowTime] = useState(new Date());
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    // Only show the full-page spinner on the very first load.
    // All subsequent fetches (week change, focus, poll) run silently in background.
    if (!firstLoadDoneRef.current) setLoading(true);
    try {
      const weekDates = week.map(d => d.iso);
      const dayResults = await Promise.all(
        weekDates.map(async (d) => ({ date: d, events: await fetchEventsForDate(d, userEmail) }))
      );
      const map: Record<string, ScheduleEvent[]> = {};
      for (const { date, events } of dayResults) {
        map[date] = events;
      }
      setEventsMap(map);
    } catch {}
    if (!firstLoadDoneRef.current) {
      firstLoadDoneRef.current = true;
      setLoading(false);
    }
  }, [week, userEmail]);

  useEffect(() => {
    // data fetching effect — setState happens inside fetchEvents, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    const interval = setInterval(() => fetchEvents(), 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));

  // Tick every minute: update current-time line + fire 10-min event reminders.
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setNowTime(now);
      // Check today's events for any starting in the next 10 minutes (±1 min window)
      const todayEvs = eventsMap[dateISO(now)] ?? [];
      const nowMins = now.getHours() * 60 + now.getMinutes();
      todayEvs.forEach(ev => {
        if (ev.type === 'deadline') return;
        const [h, m] = (ev.startTime || '').split(':').map(Number);
        const evMins = h * 60 + m;
        const diff = evMins - nowMins;
        if (diff >= 9 && diff <= 11 && !notifiedEventsRef.current.has(ev.id)) {
          notifiedEventsRef.current.add(ev.id);
          if (Platform.OS === 'web' && 'Notification' in window) {
            const show = () => new window.Notification(`Starting in 10 min: ${ev.title}`, {
              body: `${ev.startTime} — ${ev.type}`,
              icon: '/favicon.ico',
            });
            if ((window.Notification as any).permission === 'granted') {
              show();
            } else if ((window.Notification as any).permission !== 'denied') {
              (window.Notification as any).requestPermission().then((p: string) => { if (p === 'granted') show(); });
            }
          }
        }
      });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [eventsMap]);

  const removeEvent = useCallback(async (id: string, dateStr: string) => {
    await deleteEventApi(id);
    setEventsMap(prev => ({
      ...prev,
      [dateStr]: (prev[dateStr] ?? []).filter(e => e.id !== id),
    }));
  }, []);

  return { eventsMap, setEventsMap, loading, nowTime, fetchEvents, removeEvent };
}
