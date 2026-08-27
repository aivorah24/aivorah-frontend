import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { ScheduleEvent } from '../types';
import { HOUR_HEIGHT, TIMELINE_START_HOUR } from '../constants';
import { patchEventTimes } from '../services/scheduleService';

// ── Drag system: pure native DOM ────────────────────────────────────────────
// Moved verbatim out of the monolithic screen — behavior (including the raw
// onMouseDown / window mousemove|mouseup listeners) must stay identical, the
// E2E/safety-net suite depends on it.
export function useDragToMove(setEventsMap: React.Dispatch<React.SetStateAction<Record<string, ScheduleEvent[]>>>) {
  const dragRef = useRef<{
    eventId: string; dateISO: string;
    startY: number; origTop: number; duration: number;
    moved: boolean; el: HTMLElement;
  } | null>(null);
  const wasDragRef = useRef(false);
  const setEventsMapRef = useRef(setEventsMap);
  useEffect(() => { setEventsMapRef.current = setEventsMap; }, [setEventsMap]);

  const startDrag = useCallback((el: HTMLElement, clientY: number) => {
    const eventId  = el.getAttribute('data-eid') || '';
    const dateISO  = el.getAttribute('data-edate') || '';
    const origTop  = parseFloat(el.getAttribute('data-etop') || '0');
    const duration = parseFloat(el.getAttribute('data-edur') || '60');
    dragRef.current = { eventId, dateISO, startY: clientY, origTop, duration, moved: false, el };
    el.style.opacity = '0.85';
    el.style.zIndex = '999';
    el.style.cursor = 'grabbing';
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = e.clientY - d.startY;
      if (!d.moved && Math.abs(delta) < 4) return;
      d.moved = true;
      wasDragRef.current = true;
      d.el.style.top = `${Math.max(0, d.origTop + delta)}px`;
    };
    const onUp = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      d.el.style.opacity = '';
      d.el.style.zIndex = '';
      d.el.style.cursor = 'grab';
      if (!d.moved) { wasDragRef.current = false; return; }
      const rawTop    = Math.max(0, d.origTop + (e.clientY - d.startY));
      const totalMins = Math.round((rawTop / HOUR_HEIGHT) * 4) * 15;
      const clampedH  = Math.min(21, Math.max(TIMELINE_START_HOUR, TIMELINE_START_HOUR + Math.floor(totalMins / 60)));
      const newMinN   = totalMins % 60;
      const snappedTop = (clampedH - TIMELINE_START_HOUR) * HOUR_HEIGHT + (newMinN / 60) * HOUR_HEIGHT;
      const newStart  = `${String(clampedH).padStart(2,'0')}:${String(newMinN).padStart(2,'0')}`;
      const endMins   = clampedH * 60 + newMinN + d.duration;
      const newEnd    = `${String(Math.floor(endMins / 60) % 24).padStart(2,'0')}:${String(endMins % 60).padStart(2,'0')}`;
      d.el.style.top = `${snappedTop}px`;
      setEventsMapRef.current(prev => ({
        ...prev,
        [d.dateISO]: (prev[d.dateISO] ?? []).map(ev =>
          ev.id === d.eventId ? { ...ev, startTime: newStart, endTime: newEnd } : ev
        ),
      }));
      patchEventTimes(d.eventId, newStart, newEnd);
      setTimeout(() => { wasDragRef.current = false; }, 50);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return { startDrag, wasDragRef };
}
