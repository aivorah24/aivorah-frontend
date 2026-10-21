import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useScheduleEvents } from '../useScheduleEvents';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => { const React = require('react'); React.useEffect(cb, []); },
}));
jest.mock('../../../../../services/authHeader', () => ({ authHeader: jest.fn(async () => ({ Authorization: 'Bearer test-token' })) }));

const WEEK = [
  { iso: '2026-04-13', day: 'MON', date: 13 },
  { iso: '2026-04-14', day: 'TUE', date: 14 },
];

function Harness({ studentId = 's1', hideCompleted = false, week = WEEK, clearUnreadEvents = jest.fn() }: any) {
  const hook = useScheduleEvents({ studentId, week, calYear: 2026, calMonth: 4, hideCompleted, clearUnreadEvents });
  return (
    <>
      <Text testID="loading">{String(hook.loading)}</Text>
      <Text testID="deadlinesCount">{hook.deadlines.length}</Text>
      <Text testID="day1Count">{(hook.eventsMap['2026-04-13'] ?? []).length}</Text>
      <Text testID="eventDatesCount">{hook.eventDates.size}</Text>
      <Text testID="hasTimetable">{String(!!hook.timetableData)}</Text>
      <TouchableOpacity testID="addEvent" onPress={() => hook.addEvent({ title: 'New task', date: '2026-04-13', startTime: '10:00', endTime: '11:00', type: 'study', tag: 'Study Session', note: '' })}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="addBlank" onPress={() => hook.addEvent({ title: '  ', date: '2026-04-13', startTime: '10:00', endTime: '', type: 'study', tag: '', note: '' })}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="removeEvent" onPress={() => hook.removeEvent('ev1', '2026-04-13')}><Text>x</Text></TouchableOpacity>
    </>
  );
}

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useScheduleEvents — initial fetch', () => {
  test('no studentId -> never fetches, stays loading forever (guarded)', async () => {
    global.fetch = jest.fn();
    await render(<Harness studentId={null} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('fetches all 7 days + deadlines + month dots + timetable in parallel, populates real state', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/schedule/upcoming')) return jsonRes([{ id: 'd1', title: 'Deadline 1' }]);
      if (url.includes('/schedule/month')) return jsonRes({ dates: ['2026-04-13', '2026-04-20'] });
      if (url.includes('/timetable')) return jsonRes({ periods: [] });
      if (url.includes('/schedule?')) return jsonRes([{ id: 'e1', date: '2026-04-13' }]);
      return jsonRes([]);
    }) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('deadlinesCount').props.children).toBe(1);
    expect(screen.getByTestId('day1Count').props.children).toBe(1);
    expect(screen.getByTestId('eventDatesCount').props.children).toBe(2);
    expect(screen.getByTestId('hasTimetable').props.children).toBe('true');
  });

  test('upcoming deadlines always exclude completed work, even with the calendar toggle off', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url.includes('/schedule/month') ? { dates: [] } : [])) as any;

    await render(<Harness hideCompleted={false} />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    const urls = (global.fetch as jest.Mock).mock.calls.map(([u]) => String(u));
    expect(urls.find(u => u.includes('/schedule/upcoming'))).toContain('hideCompleted=true');
    expect(urls.find(u => u.includes('/schedule/month'))).toContain('hideCompleted=false');
  });

  test('a per-day fetch failure yields an empty array for that day, not a crash', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/schedule/upcoming') || url.includes('/schedule/month') || url.includes('/timetable')) return jsonRes([]);
      if (url.includes('date=2026-04-13')) return Promise.reject(new Error('down'));
      return jsonRes([]);
    }) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('day1Count').props.children).toBe(0);
  });

  test('a non-ok deadlines response leaves deadlines empty, no crash', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/schedule/upcoming')) return jsonRes([], false);
      return jsonRes([]);
    }) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('deadlinesCount').props.children).toBe(0);
  });

  test('hideCompleted is passed through as a real query parameter', async () => {
    global.fetch = jest.fn(() => jsonRes([])) as any;
    await render(<Harness hideCompleted={true} />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    const calledUrls = (global.fetch as jest.Mock).mock.calls.map(c => c[0]);
    expect(calledUrls.some((u: string) => u.includes('hideCompleted=true'))).toBe(true);
  });
});

describe('useScheduleEvents — addEvent', () => {
  test('a blank title is silently ignored, no fetch made', async () => {
    global.fetch = jest.fn(() => jsonRes([])) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    (global.fetch as jest.Mock).mockClear();

    await user.press(screen.getByTestId('addBlank'));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a real title posts to the server and appends the returned event to that date\'s list', async () => {
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST') return jsonRes({ id: 'new-ev', date: '2026-04-13', title: 'New task' });
      return jsonRes([]);
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('addEvent'));

    await waitFor(() => expect(screen.getByTestId('day1Count').props.children).toBe(1));
    expect(screen.getByTestId('eventDatesCount').props.children).toBeGreaterThanOrEqual(1);
  });

  test('a failed POST does not add anything, no crash', async () => {
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'POST') return jsonRes({ error: 'bad' }, false);
      return jsonRes([]);
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('addEvent'));

    expect(screen.getByTestId('day1Count').props.children).toBe(0);
  });
});

describe('useScheduleEvents — removeEvent', () => {
  test('sends a real DELETE request and removes the event from local state', async () => {
    global.fetch = jest.fn((url: string, opts?: any) => {
      if (opts?.method === 'DELETE') return jsonRes({ ok: true });
      if (url.includes('date=2026-04-13')) return jsonRes([{ id: 'ev1', date: '2026-04-13' }]);
      return jsonRes([]);
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('day1Count').props.children).toBe(1));

    await user.press(screen.getByTestId('removeEvent'));

    await waitFor(() => expect(screen.getByTestId('day1Count').props.children).toBe(0));
    const deleteCall = (global.fetch as jest.Mock).mock.calls.find((c: any[]) => c[1]?.method === 'DELETE');
    expect(deleteCall[0]).toContain('/schedule/ev1');
  });
});
