import { useEffect, useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

// Schedules open at the current time, like Teams: an hour before now sits at the top, other hours are a scroll away.

// `onGridLayout` goes on the view that holds the calendar, as a direct child of the page's ScrollView content, so
// its y is where the grid starts on the page.
// `headerHeight`: the calendar's day-header row above the "All day" row. With `pinnedHeader` those rows stay at the
// top of the view, so the hours scroll up to just under them.
export function useScheduleScroll({ ready, allDayHeight, hourHeight, headerHeight = 62, startHour = 0, pinnedHeader = false }: {
  ready: boolean; allDayHeight: number; hourHeight: number; headerHeight?: number; startHour?: number; pinnedHeader?: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const gridTop = useRef<number | null>(null);
  const opened = useRef(false);

  function scrollToHour(hour: number, animated = true) {
    if (gridTop.current == null) return;
    const y = gridTop.current + (pinnedHeader ? 0 : headerHeight + allDayHeight) + Math.max(0, hour - startHour) * hourHeight;
    scrollRef.current?.scrollTo({ y, animated });
  }

  function openAtNow() {
    if (opened.current || !ready || gridTop.current == null) return;
    opened.current = true;
    setTimeout(() => scrollToNow(false), 0);
  }

  function onGridLayout(e: LayoutChangeEvent) {
    gridTop.current = e.nativeEvent.layout.y;
    openAtNow();
  }

  useEffect(openAtNow, [ready]);

  // An hour before now, so the current time has a little context above it (opening, and the Today button).
  function scrollToNow(animated = true) {
    const now = new Date();
    scrollToHour(now.getHours() + now.getMinutes() / 60 - 1, animated);
  }

  return { scrollRef, onGridLayout, scrollToHour, scrollToNow };
}
