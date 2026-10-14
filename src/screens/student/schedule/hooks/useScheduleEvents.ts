import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import SERVER_URL from '../../../../config/serverUrl';
import SCHEDULE_SERVER_URL from '../../../../config/scheduleServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { ScheduleEvent } from '../types';

export function useScheduleEvents({
  studentId,
  week,
  calYear,
  calMonth,
  hideCompleted,
  clearUnreadEvents,
}: {
  studentId: string | undefined;
  week: { iso: string; day: string; date: number }[];
  calYear: number;
  calMonth: number;
  hideCompleted: boolean;
  clearUnreadEvents: () => void;
}) {
  const [eventsMap, setEventsMap] = useState<Record<string, ScheduleEvent[]>>({});
  const [deadlines, setDeadlines] = useState<ScheduleEvent[]>([]);
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());
  const [timetableData, setTimetableData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // True once the first events load completes — gates the full-screen spinner so it
  // never reappears (and never resets the scroll) on background refreshes.
  const firstLoadDoneRef = useRef(false);

  const fetchEvents = useCallback(async () => {
    if (!studentId) return;
    // Show the full-screen spinner ONLY for the very first load. Every later fetch
    // (week navigation, 30s poll, focus) keeps the grid mounted — otherwise the grid
    // unmounts and the horizontal scroll resets back to Monday each time.
    if (!firstLoadDoneRef.current) setLoading(true);
    try {
      const headers = await authHeader();
      // Fetch all 7 days of the week in parallel + deadlines + month dots + timetable
      const weekDates = week.map(d => d.iso);
      const dayFetches = weekDates.map(d =>
        fetch(`${SCHEDULE_SERVER_URL}/schedule?studentId=${studentId}&date=${d}&hideCompleted=${hideCompleted}`, { headers })
          .then(r => r.ok ? r.json() : [])
          .then((evs: ScheduleEvent[]) => ({ date: d, events: evs }))
          .catch(() => ({ date: d, events: [] }))
      );
      const [dlRes, monthRes, ttRes, ...dayResults] = await Promise.all([
        // Upcoming deadlines never list completed work, regardless of the calendar's toggle.
        fetch(`${SCHEDULE_SERVER_URL}/schedule/upcoming?studentId=${studentId}&hideCompleted=true`, { headers }),
        fetch(`${SCHEDULE_SERVER_URL}/schedule/month?studentId=${studentId}&year=${calYear}&month=${calMonth}&hideCompleted=${hideCompleted}`, { headers }),
        fetch(`${SERVER_URL}/timetable?studentId=${studentId}`),
        ...dayFetches,
      ]);

      const map: Record<string, ScheduleEvent[]> = {};
      for (const { date, events } of dayResults as { date: string; events: ScheduleEvent[] }[]) {
        map[date] = events;
      }
      setEventsMap(map);

      if (dlRes.ok) setDeadlines(await dlRes.json());
      if (monthRes.ok) {
        const m = await monthRes.json();
        setEventDates(new Set(m.dates ?? []));
      }
      if (ttRes.ok) {
        setTimetableData(await ttRes.json());
      }
    } catch {}
    if (!firstLoadDoneRef.current) { setLoading(false); firstLoadDoneRef.current = true; }
  }, [studentId, week, calYear, calMonth, hideCompleted]);

  useEffect(() => {
    // data fetching effect — setState happens inside fetchEvents, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    const interval = setInterval(() => fetchEvents(), 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  useFocusEffect(useCallback(() => { fetchEvents(); clearUnreadEvents(); }, [fetchEvents, clearUnreadEvents]));

  async function addEvent(payload: {
    title: string; date: string; startTime: string; endTime: string;
    type: string; tag: string; note: string;
  }) {
    if (!payload.title.trim() || !studentId) return;
    try {
      const res = await fetch(`${SCHEDULE_SERVER_URL}/schedule`, {
        method: 'POST',
        headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, studentId }),
      });
      if (res.ok) {
        const ev = await res.json();
        setEventsMap(prev => ({
          ...prev,
          [payload.date]: [...(prev[payload.date] ?? []), ev],
        }));
        setEventDates(prev => new Set([...prev, payload.date]));
        return ev;
      }
    } catch {}
    return null;
  }

  async function removeEvent(id: string, dateStr: string) {
    try {
      await fetch(`${SCHEDULE_SERVER_URL}/schedule/${id}`, { method: 'DELETE', headers: await authHeader() });
      setEventsMap(prev => ({
        ...prev,
        [dateStr]: (prev[dateStr] ?? []).filter(e => e.id !== id),
      }));
    } catch {}
  }

  return {
    eventsMap, deadlines, eventDates, timetableData, loading,
    fetchEvents, addEvent, removeEvent,
  };
}
