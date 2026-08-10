import { useEffect, useRef } from 'react';
import { dateISO } from '../utils/dateHelpers';
import type { ScheduleEvent } from '../types';

export function useBrowserNotifications(eventsMap: Record<string, ScheduleEvent[]>) {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function checkNotifications() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = new Date();
      const todayStr = dateISO(now);
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayEvents = eventsMap[todayStr] ?? [];
      todayEvents.forEach(ev => {
        const notifKey = `${ev.id}_${ev.startTime}`;
        if (notifiedRef.current.has(notifKey)) return;
        if (ev.startTime === currentTime) {
          notifiedRef.current.add(notifKey);
          const n = new Notification(`Aivorah — ${ev.title}`, {
            body: ev.note ? `${ev.startTime}${ev.endTime ? ' – ' + ev.endTime : ''} · ${ev.note}` : `Starting now at ${ev.startTime}`,
            icon: '/favicon.ico',
            tag: notifKey,
          });
          n.onclick = () => { window.focus(); n.close(); };
        }
      });
    }
    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [eventsMap]);
}
