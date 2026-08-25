import { useState } from 'react';
import { DURATIONS, DURATION_MINS, HOUR_HEIGHT, TIMELINE_START_HOUR } from '../constants';
import type { DragPreview } from '../types';

interface UseDragToCreateArgs {
  setModalDate: (d: string) => void;
  setNewStartTime: (t: string) => void;
  setNewEndTime: (t: string) => void;
  setModalVisible: (v: boolean) => void;
}

// Drag-to-create on an empty grid cell — pure native DOM mouse events, moved
// verbatim out of the monolithic screen (behavior must stay identical).
export function useDragToCreate({ setModalDate, setNewStartTime, setNewEndTime, setModalVisible }: UseDragToCreateArgs) {
  const [dragPreviewTeacher, setDragPreviewTeacher] = useState<DragPreview | null>(null);

  function makeOnMouseDown(dayIso: string, gridHeight: number) {
    return (e: any) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-delbtn],[data-eid]')) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const startY = e.clientY - rect.top;
      const gh = gridHeight;
      const yToT = (y: number) => {
        const mins = Math.round((Math.max(0, Math.min(y, gh)) / HOUR_HEIGHT * 60 + TIMELINE_START_HOUR * 60) / 15) * 15;
        return `${String(Math.floor(mins/60)%24).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
      };
      setDragPreviewTeacher({ dayIso, top: startY, height: 0, startT: yToT(startY), endT: yToT(startY) });
      e.preventDefault();
      const onMove = (ev: MouseEvent) => {
        const curY = ev.clientY - rect.top;
        setDragPreviewTeacher({ dayIso, top: Math.min(startY, curY), height: Math.abs(curY - startY), startT: yToT(Math.min(startY, curY)), endT: yToT(Math.max(startY, curY)) });
      };
      const onUp = (ev: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setDragPreviewTeacher(null);
        const curY = ev.clientY - rect.top;
        const startT = yToT(Math.min(startY, curY));
        const endT = yToT(Math.max(startY, curY));
        const [sh, sm] = startT.split(':').map(Number);
        const [eh, em] = endT.split(':').map(Number);
        const dur = (eh * 60 + em) - (sh * 60 + sm);
        const closest = DURATIONS.reduce((best, lbl) => {
          const mins = DURATION_MINS[lbl] ?? 60;
          return Math.abs(mins - dur) < Math.abs((DURATION_MINS[best] ?? 60) - dur) ? lbl : best;
        }, '1 hr');
        setModalDate(dayIso);
        setNewStartTime(startT);
        setNewEndTime(endT);
        setModalVisible(true);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
  }

  return { dragPreviewTeacher, makeOnMouseDown };
}
