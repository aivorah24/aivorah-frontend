// Standalone unit test for useTagFilters — no RNTL renderHook available in
// this version (see src/screens/student/learning-paths/hooks/__tests__/useSubjects.test.tsx
// for the established pattern), so a tiny harness component exposes the
// hook's state/handlers as text/props for assertions.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useTagFilters } from '../../hooks/useTagFilters';
import { ASSIGNMENT_TAGS, EVENT_TAGS } from '../../constants';
import type { ScheduleEvent, WeekDay } from '../../types';

const WEEK: WeekDay[] = [{ iso: '2026-08-24', day: 'MON', date: 24 }, { iso: '2026-08-25', day: 'TUE', date: 25 }];

function mkEvent(overrides: Partial<ScheduleEvent>): ScheduleEvent {
  return {
    id: 'e1', title: 'Ev', date: '2026-08-24', startTime: '09:00', endTime: '10:00',
    type: 'lesson', note: '', studentId: 'all', createdBy: 'teacher', tag: 'Live Class / Lesson',
    ...overrides,
  };
}

function Harness({ eventsMap }: { eventsMap: Record<string, ScheduleEvent[]> }) {
  const h = useTagFilters(eventsMap, WEEK);
  return (
    <View>
      <Text testID="allAssignmentOn">{String(h.allAssignmentOn)}</Text>
      <Text testID="allEventOn">{String(h.allEventOn)}</Text>
      <Text testID="showTagPanel">{String(h.showTagPanel)}</Text>
      <Text testID="allDayHeight">{String(h.allDayHeight)}</Text>
      <Text testID="enabledAssignmentCount">{String(h.enabledAssignmentTags.size)}</Text>
      <Text testID="enabledEventCount">{String(h.enabledEventTags.size)}</Text>
      <Text testID="passesFirstEvent">
        {String(h.passesTagFilter((eventsMap['2026-08-24'] ?? [])[0] ?? mkEvent({})))}
      </Text>
      <TouchableOpacity testID="toggle-assignment" onPress={() => h.toggleAssignmentTag(ASSIGNMENT_TAGS[0].key)} />
      <TouchableOpacity testID="toggle-event" onPress={() => h.toggleEventTag(EVENT_TAGS[0].key)} />
      <TouchableOpacity testID="toggle-all-assignment-off" onPress={() => h.toggleAllAssignment(false)} />
      <TouchableOpacity testID="toggle-all-event-on" onPress={() => h.toggleAllEvent(true)} />
      <TouchableOpacity testID="toggle-panel" onPress={() => h.setShowTagPanel(!h.showTagPanel)} />
    </View>
  );
}

describe('useTagFilters', () => {
  test('starts with every tag enabled and the panel closed', async () => {
    await render(<Harness eventsMap={{}} />);
    expect(screen.getByTestId('allAssignmentOn').props.children).toBe('true');
    expect(screen.getByTestId('allEventOn').props.children).toBe('true');
    expect(screen.getByTestId('showTagPanel').props.children).toBe('false');
    expect(Number(screen.getByTestId('enabledAssignmentCount').props.children)).toBe(ASSIGNMENT_TAGS.length);
    expect(Number(screen.getByTestId('enabledEventCount').props.children)).toBe(EVENT_TAGS.length);
  });

  test('toggling a single assignment tag off flips allAssignmentOn to false', async () => {
    const user = userEvent.setup();
    await render(<Harness eventsMap={{}} />);
    await user.press(screen.getByTestId('toggle-assignment'));
    expect(screen.getByTestId('allAssignmentOn').props.children).toBe('false');
    expect(Number(screen.getByTestId('enabledAssignmentCount').props.children)).toBe(ASSIGNMENT_TAGS.length - 1);
  });

  test('toggling the same tag twice restores it', async () => {
    const user = userEvent.setup();
    await render(<Harness eventsMap={{}} />);
    await user.press(screen.getByTestId('toggle-assignment'));
    await user.press(screen.getByTestId('toggle-assignment'));
    expect(screen.getByTestId('allAssignmentOn').props.children).toBe('true');
  });

  test('toggleAllAssignment(false) clears all assignment tags', async () => {
    const user = userEvent.setup();
    await render(<Harness eventsMap={{}} />);
    await user.press(screen.getByTestId('toggle-all-assignment-off'));
    expect(Number(screen.getByTestId('enabledAssignmentCount').props.children)).toBe(0);
    expect(screen.getByTestId('allAssignmentOn').props.children).toBe('false');
  });

  test('toggleAllEvent(true) re-enables all event tags after they were cleared', async () => {
    const user = userEvent.setup();
    await render(<Harness eventsMap={{}} />);
    await user.press(screen.getByTestId('toggle-event')); // disable one first
    await user.press(screen.getByTestId('toggle-all-event-on'));
    expect(Number(screen.getByTestId('enabledEventCount').props.children)).toBe(EVENT_TAGS.length);
  });

  test('setShowTagPanel toggles the panel visibility flag', async () => {
    const user = userEvent.setup();
    await render(<Harness eventsMap={{}} />);
    await user.press(screen.getByTestId('toggle-panel'));
    expect(screen.getByTestId('showTagPanel').props.children).toBe('true');
  });

  test('passesTagFilter: an event-tag event is gated by enabledEventTags, not enabledAssignmentTags', async () => {
    const ev = mkEvent({ tag: 'Holidays and vacations', type: 'break' });
    await render(<Harness eventsMap={{ '2026-08-24': [ev] }} />);
    expect(screen.getByTestId('passesFirstEvent').props.children).toBe('true');
  });

  test('passesTagFilter: an assignment-tag event passes when its tag is enabled', async () => {
    const ev = mkEvent({ tag: 'Live Class / Lesson', type: 'lesson' });
    await render(<Harness eventsMap={{ '2026-08-24': [ev] }} />);
    expect(screen.getByTestId('passesFirstEvent').props.children).toBe('true');
  });

  test('allDayHeight has a floor of 36 with no all-day events', async () => {
    await render(<Harness eventsMap={{}} />);
    expect(Number(screen.getByTestId('allDayHeight').props.children)).toBe(36);
  });

  test('allDayHeight grows with the count of all-day events on the busiest day', async () => {
    const allDayEv1 = mkEvent({ id: 'a1', startTime: '23:59', tag: 'Holidays and vacations', type: 'break' });
    const allDayEv2 = mkEvent({ id: 'a2', startTime: '23:59', tag: 'Whole school events', type: 'break' });
    await render(<Harness eventsMap={{ '2026-08-24': [allDayEv1, allDayEv2] }} />);
    // max=2 -> 36 + 2*26+10 clamp vs floor: Math.max(36, 2*26+10) = Math.max(36, 62) = 62
    expect(Number(screen.getByTestId('allDayHeight').props.children)).toBe(62);
  });
});
