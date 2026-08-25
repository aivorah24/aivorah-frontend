// NOTE on the visibilitychange/focus listener effect (lines 56-65 of the
// hook): tried covering it with `@jest-environment jsdom` on this file, but
// jsdom conflicts with RNTL's own render/timer machinery here — every test
// AFTER the first jsdom-dependent one started timing out (confirmed: revert
// to the default node environment and everything is stable again). This is
// intentionally-difficult-to-cover territory (Category D) — the effect is a
// thin web-only wrapper around the exact same fetchStudents() already
// exercised by every other test in this file, not distinct logic — so it's
// not worth destabilizing the whole suite to force. Left uncovered,
// documented here rather than silently.
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor, act } from '@testing-library/react-native';
import { useTeacherDashboardData } from '../../hooks/useTeacherDashboardData';

let focusEffectCb: (() => void) | undefined;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { focusEffectCb = cb; },
}));

function jsonRes(url: string) {
  if (url.includes('/insights')) return Promise.resolve({ json: async () => ({ totals: { totalSubmissions: 1 } }) });
  if (url.includes('/recent-activity/')) return Promise.resolve({ json: async () => [{ studentId: 's1' }] });
  if (url.includes('/by-teacher/')) return Promise.resolve({ json: async () => [{ id: 's1', name: 'Aarav' }] });
  return Promise.resolve({ json: async () => [] });
}

function Harness({ email }: { email?: string }) {
  const h = useTeacherDashboardData(email);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="refreshing">{String(h.refreshing)}</Text>
      <Text testID="studentCount">{h.students.length}</Text>
      <Text testID="totalSubmissions">{h.insights?.totals?.totalSubmissions ?? ''}</Text>
      <Text testID="activityCount">{h.activityFeed.length}</Text>
    </>
  );
}

beforeEach(() => {
  focusEffectCb = undefined;
  global.fetch = jest.fn((url: string) => jsonRes(url)) as any;
});

describe('useTeacherDashboardData', () => {
  test('fetches all 3 endpoints in parallel and populates students/insights/activityFeed', async () => {
    await render(<Harness email="teacher@aivorah.test" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('studentCount').props.children).toBe(1);
    expect(screen.getByTestId('totalSubmissions').props.children).toBe(1);
    expect(screen.getByTestId('activityCount').props.children).toBe(1);
  });

  test('falls back to teacher@demo.com when no email is passed yet', async () => {
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    const calls = (global.fetch as jest.Mock).mock.calls.map(c => String(c[0]));
    expect(calls.some(u => u.includes('teacher%40demo.com') || u.includes('teacher@demo.com'))).toBe(true);
  });

  test('one endpoint rejecting discards all 3 results, keeping previous data (Promise.all, not allSettled)', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/insights')) return Promise.reject(new Error('down'));
      return jsonRes(url);
    }) as any;

    await render(<Harness email="teacher@aivorah.test" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    // Nothing got set — students stays at its initial empty state.
    expect(screen.getByTestId('studentCount').props.children).toBe(0);
  });

  test('registers a real useFocusEffect callback that refetches on screen focus', async () => {
    await render(<Harness email="teacher@aivorah.test" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;

    expect(focusEffectCb).toBeDefined();
    await act(async () => { focusEffectCb!(); });

    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  test('auto-refreshes every 30 seconds', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    await render(<Harness email="teacher@aivorah.test" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;

    await act(async () => { jest.advanceTimersByTime(30 * 1000); });

    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    jest.useRealTimers();
  });
});
