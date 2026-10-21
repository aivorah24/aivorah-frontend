import React from 'react';
import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import WeekGrid, { nowLineTop, fmtHour12, GRID_HOUR_HEIGHT } from '../WeekGrid';

const colors = { accentYellow: '#fa0', bgDark: '#000', textDim: '#666', textMuted: '#555', borderColor: '#ddd' } as any;
const week = [{ iso: '2026-04-13', day: 'MON', date: 13 }, { iso: '2026-04-14', day: 'TUE', date: 14 }];
type Ev = { id: string; title: string; allDay?: boolean };
const events: Record<string, Ev[]> = { '2026-04-13': [{ id: 'a', title: 'Holiday', allDay: true }, { id: 'b', title: 'Lesson' }] };

function props(overrides: any = {}) {
  return {
    colors, testIdPrefix: 'x', week, todayISO: '2026-04-13', allDayHeight: 40, colWidth: 120, gridHeight: 24 * GRID_HOUR_HEIGHT,
    hScrollRef: { current: null }, accent: '#fa0', nowTime: new Date(2026, 3, 13, 10, 30),
    allDayEvents: (iso: string) => (events[iso] ?? []).filter((e) => e.allDay),
    timedEvents: (iso: string) => (events[iso] ?? []).filter((e) => !e.allDay),
    renderAllDayChip: (e: Ev) => <Text>{`chip:${e.title}`}</Text>,
    renderTimedEvent: (e: Ev) => <Text>{`event:${e.title}`}</Text>,
    onAllDayPress: jest.fn(),
    ...overrides,
  };
}

describe('WeekGrid', () => {
  test('renders each persona\'s all-day chips and timed events in their lanes', async () => {
    await render(<WeekGrid<Ev> {...props()} />);
    expect(screen.getByText('chip:Holiday')).toBeTruthy();
    expect(screen.getByText('event:Lesson')).toBeTruthy();
  });

  test('test IDs use the persona prefix', async () => {
    await render(<WeekGrid<Ev> {...props()} />);
    expect(screen.getByTestId('x-day-header-2026-04-13')).toBeTruthy();
    expect(screen.getByTestId('x-allday-col-2026-04-14')).toBeTruthy();
    expect(screen.getByTestId('x-day-col-2026-04-13')).toBeTruthy();
    expect(screen.getByTestId('x-slot-2026-04-13-09:00')).toBeTruthy();
  });

  test('slots are tappable only when onSlotPress is given', async () => {
    const onSlotPress = jest.fn();
    const user = userEvent.setup();
    await render(<WeekGrid<Ev> {...props({ onSlotPress })} />);
    await user.press(screen.getByTestId('x-slot-2026-04-14-09:00'));
    expect(onSlotPress).toHaveBeenCalledWith('2026-04-14', '09:00');
  });

  test('now line sits on today at the current time, including after 11 pm', async () => {
    await render(<WeekGrid<Ev> {...props({ nowTime: new Date(2026, 3, 13, 23, 30) })} />);
    expect(screen.getByTestId('x-now-line')).toHaveStyle({ top: 23.5 * GRID_HOUR_HEIGHT });
  });

  test('helpers', () => {
    expect(nowLineTop(new Date(2026, 0, 1, 0, 0))).toBe(0);
    expect(nowLineTop(new Date(2026, 0, 1, 10, 30))).toBe(10.5 * GRID_HOUR_HEIGHT);
    expect(fmtHour12('00:00')).toBe('12 am');
    expect(fmtHour12('13:00')).toBe('1 pm');
  });
});
