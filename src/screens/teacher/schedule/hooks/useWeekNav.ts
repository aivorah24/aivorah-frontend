import { useEffect, useMemo, useRef, useState, MutableRefObject } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { buildWeek, dateISO } from '../utils/scheduleUtils';
import { DAY_COL_WIDTH, HOUR_HEIGHT, TIME_LABEL_WIDTH, TIMELINE_START_HOUR } from '../constants';

export function useWeekNav(firstLoadDoneRef: MutableRefObject<boolean>) {
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => dateISO(today), [today]);
  const [weekBase, setWeekBase] = useState(today);
  const week = useMemo(() => buildWeek(weekBase), [weekBase]);

  const { width: screenWidth } = useWindowDimensions();
  const availableGridWidth = Math.max(700, screenWidth - 260 - 24);
  const colWidth = Math.max(DAY_COL_WIDTH, Math.floor((availableGridWidth - TIME_LABEL_WIDTH) / 7));

  const hScrollRef = useRef<ScrollView>(null);
  const vScrollRef = useRef<ScrollView>(null);

  function scrollToTodayCol(base: Date, cw: number) {
    const dow = base.getDay();          // 0=Sun
    const todayCol = (dow + 6) % 7;    // Mon=0 … Sun=6
    hScrollRef.current?.scrollTo({ x: todayCol * cw, animated: true });
  }

  function scrollToCurrentTime(animated = true) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const timeOffsetY = Math.max(0, ((currentMins - TIMELINE_START_HOUR * 60 - 60) / 60) * HOUR_HEIGHT);
    setTimeout(() => vScrollRef.current?.scrollTo({ y: timeOffsetY, animated }), 200);
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
    scrollToCurrentTime();
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
    goToday, onGridContentSizeChange,
  };
}
