import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { DAY_COL_WIDTH, TIME_LABEL_WIDTH, TIMES, HOUR_HEIGHT, TIMELINE_START_HOUR } from '../constants';
import { buildWeek, buildMonthCalendar, dateISO } from '../utils/dateHelpers';

// `gridWidth`: the calendar's measured width, so the 7 day columns fill it exactly (the window size is only a first guess).
export function useWeekNavigation(scrollToNow?: MutableRefObject<((animated?: boolean) => void) | null>, gridWidth?: number | null) {
  const today = useMemo(() => new Date(), []);
  const [weekBase, setWeekBase] = useState(today);
  const week = useMemo(() => buildWeek(weekBase), [weekBase]);
  const todayISO = useMemo(() => dateISO(today), [today]);

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const calWeeks = useMemo(() => buildMonthCalendar(calYear, calMonth), [calYear, calMonth]);

  const { width: screenWidth } = useWindowDimensions();
  const availableGridWidth = gridWidth || Math.max(700, screenWidth - 260 - 24);
  const colWidth = Math.max(DAY_COL_WIDTH, Math.floor((availableGridWidth - TIME_LABEL_WIDTH) / 7));
  const gridHeight = TIMES.length * HOUR_HEIGHT;

  const hScrollRef = useRef<ScrollView>(null);
  const vScrollRef = useRef<ScrollView>(null);
  // Guards the one-time auto-scroll-to-today after the grid first lays out.
  const didInitialScrollRef = useRef(false);

  // Horizontal-scroll the day-grid so today's column is at the left edge —
  // mirrors the Parent schedule's working "Today" behaviour exactly.
  function scrollToToday(cw: number) {
    const dow = today.getDay();          // 0=Sun
    const todayCol = (dow + 6) % 7;      // Mon=0 … Sun=6
    hScrollRef.current?.scrollTo({ x: todayCol * cw, animated: true });
  }

  // Vertical scrolling (open at now, Today → now) lives in useScheduleScroll; the screen passes it in.
  function scrollToCurrentTime(animated = true) {
    scrollToNow?.current?.(animated);
  }

  function prevWeek() { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); }
  function nextWeek() { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); }

  function goToday() {
    const now = new Date();
    setWeekBase(now);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth() + 1);
    setTimeout(() => scrollToToday(colWidth), 100);
    scrollToCurrentTime();
  }

  function prevMonth() {
    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  }

  function nextMonth() {
    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  }

  function selectDate(year: number, month: number, day: number) {
    setWeekBase(new Date(year, month - 1, day));
  }

  // Auto-scroll to today whenever the current week is in view (mount + week change),
  // exactly like the Parent schedule.
  useEffect(() => {
    if (week.some(d => d.iso === todayISO)) {
      setTimeout(() => scrollToToday(colWidth), 300);
    }
  }, [week, todayISO, colWidth]);

  return {
    today, todayISO, weekBase, setWeekBase, week,
    calYear, calMonth, calWeeks,
    colWidth, gridHeight,
    hScrollRef, vScrollRef, didInitialScrollRef,
    prevWeek, nextWeek, goToday, prevMonth, nextMonth, selectDate,
    scrollToToday, scrollToCurrentTime,
  };
}
