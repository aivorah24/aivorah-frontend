import { useCallback, useState } from 'react';
import { ASSIGNMENT_TAGS, EVENT_TAGS } from '../constants';
import type { ScheduleEvent } from '../types';

export function useTagFilters() {
  const [filterType, setFilterType] = useState<'all' | 'assignments' | 'study' | 'classes'>('all');
  const [hideCompleted, setHideCompleted] = useState(false);

  const [enabledAssignmentTags, setEnabledAssignmentTags] = useState<Set<string>>(
    () => new Set(ASSIGNMENT_TAGS.map(t => t.key))
  );
  const [enabledEventTags, setEnabledEventTags] = useState<Set<string>>(
    () => new Set(EVENT_TAGS.map(t => t.key))
  );
  const [showTagPanel, setShowTagPanel] = useState(false);

  // Returns true if the event's tag passes the current tag filter checkboxes
  const passesTagFilter = useCallback((ev: ScheduleEvent): boolean => {
    const tag = ev.tag || '';
    // Check event tags
    const isEventTag = EVENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase()));
    if (isEventTag) {
      return EVENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase()) && enabledEventTags.has(t.key));
    }
    // Check assignment tags
    return ASSIGNMENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase()) && enabledAssignmentTags.has(t.key))
      || (!ASSIGNMENT_TAGS.some(t => tag.toLowerCase().includes(t.key.toLowerCase())) && enabledAssignmentTags.size > 0);
  }, [enabledAssignmentTags, enabledEventTags]);

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
    filterType, setFilterType,
    hideCompleted, setHideCompleted,
    enabledAssignmentTags, enabledEventTags,
    showTagPanel, setShowTagPanel,
    passesTagFilter,
    toggleAssignmentTag, toggleEventTag,
    toggleAllAssignment, toggleAllEvent,
    allAssignmentOn, allEventOn,
  };
}
