import { useCallback, useMemo, useState } from 'react';
import { ASSIGNMENT_TAGS, EVENT_TAGS } from '../constants';
import type { ScheduleEvent, WeekDay } from '../types';

export function useTagFilters(eventsMap: Record<string, ScheduleEvent[]>, week: WeekDay[]) {
  const [enabledAssignmentTags, setEnabledAssignmentTags] = useState<Set<string>>(
    () => new Set(ASSIGNMENT_TAGS.map(t => t.key))
  );
  const [enabledEventTags, setEnabledEventTags] = useState<Set<string>>(
    () => new Set(EVENT_TAGS.map(t => t.key))
  );
  const [showTagPanel, setShowTagPanel] = useState(false);

  const passesTagFilter = useCallback((ev: ScheduleEvent): boolean => {
    const tag = ev.tag || '';
    const isEventTag = EVENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase()));
    if (isEventTag) {
      return EVENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase()) && enabledEventTags.has(t.key));
    }
    return ASSIGNMENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase()) && enabledAssignmentTags.has(t.key))
      || (!ASSIGNMENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase())) && enabledAssignmentTags.size > 0);
  }, [enabledAssignmentTags, enabledEventTags]);

  // Compute all-day lane height from events — avoids onLayout feedback loop
  const allDayHeight = useMemo(() => {
    const max = Math.max(
      1,
      ...week.map((d) =>
        (eventsMap[d.iso] ?? []).filter((e) => {
          if (!passesTagFilter(e)) return false;
          const tagLower = (e.tag || '').toLowerCase();
          const isEventTag2 = ['holiday', 'vacation', 'assembly', 'timeline', 'whole school', 'rotation', 'cycle'].some((k) => tagLower.includes(k));
          return e.startTime === '23:59' || e.isAllDay || e.type === 'deadline' || e.type === 'challenge' || isEventTag2;
        }).length
      )
    );
    return Math.max(36, max * 26 + 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsMap, week, enabledAssignmentTags, enabledEventTags]);

  const toggleAssignmentTag = useCallback((key: string) => {
    setEnabledAssignmentTags(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleEventTag = useCallback((key: string) => {
    setEnabledEventTags(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleAllAssignment = useCallback((on: boolean) => {
    setEnabledAssignmentTags(on ? new Set(ASSIGNMENT_TAGS.map(t => t.key)) : new Set());
  }, []);

  const toggleAllEvent = useCallback((on: boolean) => {
    setEnabledEventTags(on ? new Set(EVENT_TAGS.map(t => t.key)) : new Set());
  }, []);

  const allAssignmentOn = enabledAssignmentTags.size === ASSIGNMENT_TAGS.length;
  const allEventOn = enabledEventTags.size === EVENT_TAGS.length;

  return {
    enabledAssignmentTags, enabledEventTags, showTagPanel, setShowTagPanel,
    passesTagFilter, allDayHeight,
    toggleAssignmentTag, toggleEventTag, toggleAllAssignment, toggleAllEvent,
    allAssignmentOn, allEventOn,
  };
}
