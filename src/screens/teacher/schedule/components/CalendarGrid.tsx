import React from 'react';
import { Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import WeekGrid from '../../../../components/schedule/WeekGrid';
import { calcEventTop, calcEventHeight, tagColors } from '../utils/scheduleUtils';
import type { ScheduleEvent, StudentItem, WeekDay, DragPreview } from '../types';

interface Props {
  colors: AppColors;
  gold: string;
  styles: any;
  week: WeekDay[];
  todayISO: string;
  eventsMap: Record<string, ScheduleEvent[]>;
  passesTagFilter: (ev: ScheduleEvent) => boolean;
  allDayHeight: number;
  colWidth: number;
  gridHeight: number;
  hScrollRef: React.RefObject<ScrollView | null>;
  onGridContentSizeChange: () => void;
  nowTime: Date;
  students: StudentItem[];
  dragPreviewTeacher: DragPreview | null;
  makeOnMouseDown: (dayIso: string, gridHeight: number) => (e: any) => void;
  startDrag: (el: HTMLElement, clientY: number) => void;
  wasDragRef: React.MutableRefObject<boolean>;
  removeEvent: (id: string, dateStr: string) => void;
  openModal: (presetDate?: string, presetTime?: string, presetAllDay?: boolean, presetTag?: string) => void;
  setSelectedEvent: (e: any) => void;
  // Bug #19 ("tap-date doesn't scroll"): the day header used to be a plain
  // View — tapping a date did nothing at all. Optional so existing callers
  // that don't care about this still work.
  onDayHeaderPress?: (iso: string) => void;
}

const ALL_DAY_TAGS = ['holiday', 'vacation', 'assembly', 'timeline', 'whole school', 'rotation', 'cycle'];

export default function CalendarGrid({
  colors, gold, styles, week, todayISO, eventsMap, passesTagFilter,
  allDayHeight, colWidth, gridHeight, hScrollRef, onGridContentSizeChange, nowTime,
  students, dragPreviewTeacher, makeOnMouseDown, startDrag, wasDragRef,
  removeEvent, openModal, setSelectedEvent, onDayHeaderPress,
}: Props) {
  return (
    <WeekGrid<ScheduleEvent>
      colors={colors}
      testIdPrefix="teacher-schedule"
      week={week}
      todayISO={todayISO}
      allDayHeight={allDayHeight}
      colWidth={colWidth}
      gridHeight={gridHeight}
      hScrollRef={hScrollRef}
      onGridContentSizeChange={onGridContentSizeChange}
      nowTime={nowTime}
      accent={gold}
      dragPreview={dragPreviewTeacher}
      onDayHeaderPress={onDayHeaderPress}
      onAllDayPress={(iso) => openModal(iso, undefined, true, 'Holidays and vacations')}
      onSlotPress={(iso, t) => openModal(iso, t)}
      onColMouseDown={(e, iso) => makeOnMouseDown(iso, gridHeight)(e)}
      // Deadline/challenge items (stored at 23:59) go in the all-day lane — a 1-minute block in the grid would be invisible.
      allDayEvents={(iso) => (eventsMap[iso] ?? []).filter(e => {
        if (!passesTagFilter(e)) return false;
        const tagLower = (e.tag || '').toLowerCase();
        const isEventTag = ALL_DAY_TAGS.some(k => tagLower.includes(k));
        return e.startTime === '23:59' || e.isAllDay || e.type === 'deadline' || e.type === 'challenge' || isEventTag;
      })}
      timedEvents={(iso) => (eventsMap[iso] ?? []).filter(e => e.startTime !== '23:59' && passesTagFilter(e))}
      renderAllDayChip={(e) => {
        const [accent, fill, textCol] = tagColors(e.tag, e.type);
        return (
          <TouchableOpacity
            style={[styles.allDayChip, { backgroundColor: fill, borderLeftColor: accent }]}
            onPress={(evt) => {
              evt.stopPropagation();
              setSelectedEvent({ ...e, accent, fill, textCol });
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.allDayChipText, { color: textCol }]} numberOfLines={1}>{e.title}</Text>
          </TouchableOpacity>
        );
      }}
      // Raw div for reliable drag-to-move on web.
      renderTimedEvent={(event, iso) => {
        const d = { iso };
        const origTop = calcEventTop(event.startTime);
        const height  = calcEventHeight(event.startTime, event.endTime);
        const [accent, fill, textCol] = tagColors(event.tag, event.type);
        const [sh, sm] = event.startTime.split(':').map(Number);
        const [eh, em] = (event.endTime || event.startTime).split(':').map(Number);
        const durationMins = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));
        const studentLabel = event.studentId === 'all'
          ? 'All students'
          : ((event as any).studentName ?? students.find(s => s.id === event.studentId)?.name ?? 'Student');
        return (
          <div
            key={event.id}
            data-testid={`teacher-schedule-event-${event.id}`}
            data-eid={event.id}
            data-edate={d.iso}
            data-etop={String(origTop)}
            data-edur={String(durationMins)}
            onMouseDown={(e) => {
              // Skip if clicking delete button
              if ((e.target as HTMLElement).closest('[data-delbtn]')) return;
              e.preventDefault();
              startDrag(e.currentTarget, e.clientY);
            }}
            onClick={(e) => {
              // A drag (mousemove past the 4px threshold) sets wasDragRef —
              // only open the detail popup for a genuine click, not a drop.
              if (wasDragRef.current) return;
              if ((e.target as HTMLElement).closest('[data-delbtn]')) return;
              setSelectedEvent({ ...event, date: d.iso, accent, fill, textCol });
            }}
            style={{
              position: 'absolute', left: 2, right: 2,
              top: origTop, height,
              backgroundColor: fill,
              borderLeft: `4px solid ${accent}`,
              borderRadius: 4,
              paddingLeft: 6, paddingRight: 5, paddingTop: 3, paddingBottom: 3,
              overflow: 'hidden',
              cursor: 'grab',
              userSelect: 'none',
              zIndex: 2,
              fontFamily: fonts.sans,
            }}
          >
            <div style={{ fontFamily: fonts.sans, fontSize: 11, fontWeight: 700, color: textCol, lineHeight: '13px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{event.title}</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 10, color: accent, lineHeight: '13px' }}>{event.startTime}{event.endTime ? `–${event.endTime}` : ''}</div>
            <div style={{ fontFamily: fonts.sans, fontSize: 10, fontWeight: 600, color: textCol, opacity: 0.8, marginTop: 1, lineHeight: '13px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{studentLabel}</div>
            <div
              data-delbtn="1"
              data-testid={`teacher-schedule-event-delete-${event.id}`}
              onClick={() => removeEvent(event.id, d.iso)}
              style={{ position: 'absolute', top: 3, right: 3, cursor: 'pointer', padding: 2 }}
            >
              <Feather name="x" size={10} color={accent} />
            </div>
          </div>
        );
      }}
    />
  );
}
