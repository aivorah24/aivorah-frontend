import { useEffect, useMemo, useRef, useState, MutableRefObject } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { buildWeek, dateISO } from '../utils/scheduleUtils';
import { DAY_COL_WIDTH, HOUR_HEIGHT, TIME_LABEL_WIDTH, TIMELINE_START_HOUR } from '../constants';

// `gridWidth`: the calendar's measured width, so the 7 day columns fill it exactly (the window size is only a first guess).
export function useWeekNav(firstLoadDoneRef: MutableRefObject<boolean>, scrollToNow?: MutableRefObject<((animated?: boolean) => void) | null>, gridWidth?: number | null) {
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => dateISO(today), [today]);
  const [weekBase, setWeekBase] = useState(today);
  const week = useMemo(() => buildWeek(weekBase), [weekBase]);

  const { width: screenWidth } = useWindowDimensions();
  const availableGridWidth = gridWidth || Math.max(700, screenWidth - 260 - 24);
  const colWidth = Math.max(DAY_COL_WIDTH, Math.floor((availableGridWidth - TIME_LABEL_WIDTH) / 7));

  const hScrollRef = useRef<ScrollView>(null);
  const vScrollRef = useRef<ScrollView>(null);

  // Bug #19: was Monday-first (`(dow + 6) % 7`) — the grid is now
  // Sunday-first (see buildWeek()), so today's column is just `getDay()`
  // itself, no wraparound needed.
  function scrollToTodayCol(base: Date, cw: number) {
    const todayCol = base.getDay();     // 0=Sun … 6=Sat, matches buildWeek()
    hScrollRef.current?.scrollTo({ x: todayCol * cw, animated: true });
  }

  // Vertical scrolling (open at now, Today → now) lives in useScheduleScroll; the screen passes it in.
  function scrollToCurrentTime(animated = true) {
    scrollToNow?.current?.(animated);
  }

  function goToday() {
    const now = new Date();
    const alreadyOnThisWeek = week.some(d => d.iso === todayISO);
    if (alreadyOnThisWeek) {
      scrollToTodayCol(now, colWidth);
      scrollToCurrentTime();
    } else {
      setWeekBase(now);
    }
  }

  useEffect(() => {
    if (week.some(d => d.iso === todayISO)) {
      setTimeout(() => scrollToTodayCol(weekBase, colWidth), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, todayISO, colWidth]);

  function onGridContentSizeChange() {
    // Auto-scroll to today's column whenever the grid re-renders
    // with today's week (first load or after navigating back via Today btn).
    if (week.some(d => d.iso === todayISO)) {
      if (!firstLoadDoneRef.current) {
        firstLoadDoneRef.current = true;
        scrollToTodayCol(weekBase, colWidth);
      }
    }
  }

  return {
    today, todayISO, weekBase, setWeekBase, week,
    colWidth, hScrollRef, vScrollRef,
    goToday, onGridContentSizeChange, scrollToCurrentTime,
  };
}
