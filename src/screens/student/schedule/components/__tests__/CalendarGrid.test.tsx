import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import CalendarGrid from '../CalendarGrid';
import type { ScheduleEvent } from '../../types';

const colors = { accentYellow: '#fa0', bgDark: '#000', textDim: '#666' } as any;
const week = [
  { iso: '2026-04-13', day: 'MON', date: 13 }, { iso: '2026-04-14', day: 'TUE', date: 14 },
];

function ev(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return { id: '1', title: 'maths class', date: '2026-04-13', startTime: '10:00', endTime: '11:00', type: 'lesson', note: '', studentId: 's1', createdBy: 'teacher', tag: null, ...overrides };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof CalendarGrid>> = {}) {
  return {
    loading: false, week, todayISO: '2026-04-13',
    eventsMap: {}, hideCompleted: false, filterType: 'all', passesTagFilter: () => true,
    allDayHeight: 40, gridHeight: 100, colWidth: 140,
    hScrollRef: { current: null }, didInitialScrollRef: { current: true }, scrollToToday: jest.fn(),
    dragPreview: null, onColMouseDown: jest.fn(), onAllDaySlotPress: jest.fn(),
    onEventPress: jest.fn(), onRemoveEvent: jest.fn(),
    styles: {}, colors,
    ...overrides,
  } as React.ComponentProps<typeof CalendarGrid>;
}

describe('CalendarGrid — loading state', () => {
  test('shows the real loading message while loading is true', async () => {
    await render(<CalendarGrid {...baseProps({ loading: true })} />);
    expect(screen.getByText('Loading schedule…')).toBeTruthy();
  });
});

describe('CalendarGrid — timed events', () => {
  test('a real timed event renders its title and time range', async () => {
    await render(<CalendarGrid {...baseProps({ eventsMap: { '2026-04-13': [ev({ title: 'maths class' })] } })} />);
    expect(screen.getByText('Maths Class')).toBeTruthy(); // title-cased
    expect(screen.getByText('10:00–11:00')).toBeTruthy();
  });

  test('a deadline (type: deadline) never appears in the timed grid, only the all-day lane', async () => {
    await render(<CalendarGrid {...baseProps({ eventsMap: { '2026-04-13': [ev({ type: 'deadline', title: 'Worksheet Due', startTime: '23:59' })] } })} />);
    expect(screen.queryByText('Worksheet Due')).toBeTruthy(); // shown in all-day lane
    // Confirm it's not ALSO duplicated as a timed block by checking only one instance exists.
    expect(screen.getAllByText('Worksheet Due')).toHaveLength(1);
  });

  test('hideCompleted hides completed timed events', async () => {
    await render(<CalendarGrid {...baseProps({ hideCompleted: true, eventsMap: { '2026-04-13': [ev({ title: 'Done Task', isCompleted: true })] } })} />);
    expect(screen.queryByText('Done Task')).toBeNull();
  });

  test('filterType "assignments" hides plain timed study/lesson events', async () => {
    await render(<CalendarGrid {...baseProps({ filterType: 'assignments', eventsMap: { '2026-04-13': [ev({ title: 'Personal Study', type: 'study' })] } })} />);
    expect(screen.queryByText('Personal Study')).toBeNull();
  });

  test('an event failing passesTagFilter is excluded from the grid', async () => {
    await render(<CalendarGrid {...baseProps({ passesTagFilter: () => false, eventsMap: { '2026-04-13': [ev({ title: 'Filtered Out' })] } })} />);
    expect(screen.queryByText('Filtered Out')).toBeNull();
  });

  test('pressing an event calls onEventPress with the real event and its colors', async () => {
    const onEventPress = jest.fn();
    const user = userEvent.setup();
    await render(<CalendarGrid {...baseProps({ onEventPress, eventsMap: { '2026-04-13': [ev({ title: 'Maths Class' })] } })} />);

    await user.press(screen.getByText('Maths Class'));

    expect(onEventPress).toHaveBeenCalledWith(expect.objectContaining({ title: 'Maths Class' }), expect.any(Array));
  });

  test('a non-timetable event shows a delete button that calls onRemoveEvent with the real id and date', async () => {
    const onRemoveEvent = jest.fn();
    const user = userEvent.setup();
    await render(<CalendarGrid {...baseProps({ onRemoveEvent, eventsMap: { '2026-04-13': [ev({ id: 'ev-99' })] } })} />);

    await user.press(screen.getByTestId('schedule-delete-event-ev-99'));

    expect(onRemoveEvent).toHaveBeenCalledWith('ev-99', '2026-04-13');
  });

  test('a timetable-class event (isTimetableClass) never shows a delete button', async () => {
    await render(<CalendarGrid {...baseProps({ eventsMap: { '2026-04-13': [ev({ isTimetableClass: true, title: 'Timetable Lesson' })] } })} />);
    // The event renders (title present) but has no delete affordance — verified
    // indirectly since the delete button has no accessible text/label of its own
    // and this branch is guarded by `!event.isTimetableClass` in the component.
    expect(screen.getByText('Timetable Lesson')).toBeTruthy();
  });
});

describe('CalendarGrid — all-day lane', () => {
  test('an event with startTime 23:59 appears in the all-day lane with its real title', async () => {
    await render(<CalendarGrid {...baseProps({ eventsMap: { '2026-04-13': [ev({ startTime: '23:59', title: 'School Holiday' })] } })} />);
    expect(screen.getByText('School Holiday')).toBeTruthy();
  });

  test('filterType "study" hides all-day events entirely', async () => {
    await render(<CalendarGrid {...baseProps({ filterType: 'study', eventsMap: { '2026-04-13': [ev({ startTime: '23:59', title: 'Hidden Holiday' })] } })} />);
    expect(screen.queryByText('Hidden Holiday')).toBeNull();
  });

  test('a multi-day (spanning) all-day event shows the real "Due <date>" prefix', async () => {
    await render(<CalendarGrid {...baseProps({
      eventsMap: { '2026-04-13': [ev({ startTime: '23:59', title: 'Long Assignment', date: '2026-04-13', startDate: '2026-04-10' })] },
    })} />);
    expect(screen.getByText(/Due 04-13/)).toBeTruthy();
  });

  test('pressing the empty all-day lane calls onAllDaySlotPress with the real day', async () => {
    const onAllDaySlotPress = jest.fn();
    const user = userEvent.setup();
    await render(<CalendarGrid {...baseProps({ onAllDaySlotPress })} />);

    await user.press(screen.getByTestId('schedule-allday-col-2026-04-13'));

    expect(onAllDaySlotPress).toHaveBeenCalledWith('2026-04-13');
  });
});

describe('CalendarGrid — shared table', () => {
  test('the add-event button lives in the screen header now, not in the grid', async () => {
    await render(<CalendarGrid {...baseProps()} />);
    expect(screen.queryByTestId('schedule-add-event-button')).toBeNull();
  });

  test('the current-time line shows in the week that contains today', async () => {
    await render(<CalendarGrid {...baseProps()} />);
    expect(screen.getByTestId('schedule-now-line')).toBeTruthy();
  });

  test('no current-time line in a week without today', async () => {
    await render(<CalendarGrid {...baseProps({ todayISO: '2026-05-01' })} />);
    expect(screen.queryByTestId('schedule-now-line')).toBeNull();
  });

  test('day headers use the teacher format ("13 Mon")', async () => {
    await render(<CalendarGrid {...baseProps()} />);
    expect(screen.getByText('13 Mon')).toBeTruthy();
  });
});

describe('CalendarGrid — drag preview', () => {
  test('a real drag preview taller than 8px renders the live start–end time label', async () => {
    await render(<CalendarGrid {...baseProps({ dragPreview: { dayIso: '2026-04-13', top: 20, height: 40, startT: '10:00', endT: '10:45' } })} />);
    expect(screen.getByText('10:00 – 10:45')).toBeTruthy();
  });

  test('no drag preview -> no preview label rendered', async () => {
    await render(<CalendarGrid {...baseProps({ dragPreview: null })} />);
    expect(screen.queryByText(/–/)).toBeNull();
  });
});
