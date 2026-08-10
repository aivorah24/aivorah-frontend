import { useState } from 'react';
import { Platform } from 'react-native';
import { HOUR_HEIGHT, TIMES, TIMELINE_START_HOUR, DURATION_MINS } from '../constants';
import type { DragPreview } from '../types';

export function useDragToCreate({
  onQuickCreate,
  onDragCreate,
}: {
  onQuickCreate: (dayIso: string, startT: string) => void;
  onDragCreate: (dayIso: string, startT: string, endT: string) => void;
}) {
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const gh = TIMES.length * HOUR_HEIGHT;

  function yToTime(y: number): string {
    const clampedY = Math.max(0, Math.min(y, gh));
    const totalMins = Math.round((clampedY / HOUR_HEIGHT * 60 + TIMELINE_START_HOUR * 60) / 15) * 15;
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function handleColMouseDown(e: any, dayIso: string) {
    if (Platform.OS !== 'web') return;
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const startY = e.clientY - rect.top;
    setDragPreview({ dayIso, top: startY, height: 0, startT: yToTime(startY), endT: yToTime(startY) });
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      const curY = ev.clientY - rect.top;
      const top = Math.min(startY, curY);
      const height = Math.abs(curY - startY);
      setDragPreview({ dayIso, top, height, startT: yToTime(Math.min(startY, curY)), endT: yToTime(Math.max(startY, curY)) });
    };

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragPreview(null);
      const curY = ev.clientY - rect.top;
      const startT = yToTime(Math.min(startY, curY));
      const endT   = yToTime(Math.max(startY, curY));
      const [sh, sm] = startT.split(':').map(Number);
      const [eh, em] = endT.split(':').map(Number);
      const durationMins = (eh * 60 + em) - (sh * 60 + sm);

      if (durationMins >= 15) {
        onDragCreate(dayIso, startT, endT);
      } else {
        onQuickCreate(dayIso, startT);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return { dragPreview, handleColMouseDown };
}
