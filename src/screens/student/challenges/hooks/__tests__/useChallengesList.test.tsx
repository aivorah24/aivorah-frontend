import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useChallengesList } from '../useChallengesList';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(cb, []); },
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

jest.setTimeout(15000);

function Harness({ studentId = 's1', initialTab = undefined, refreshProfile = jest.fn().mockResolvedValue(undefined) }: any) {
  const hook = useChallengesList({ grade: 'Grade 4', curriculum: 'NCERT', studentId, initialTab, refreshProfile });
  return (
    <>
      <Text testID="loading">{String(hook.loading)}</Text>
      <Text testID="activeTab">{hook.activeTab}</Text>
      <Text testID="challengesCount">{hook.challenges.length}</Text>
      <Text testID="filteredCount">{hook.filtered.length}</Text>
      <Text testID="availableCount">{hook.counts.available}</Text>
      <Text testID="assignedCount">{hook.counts.assigned}</Text>
      <Text testID="completedCount">{hook.counts.completed}</Text>
      <Text testID="inProgressCount">{hook.counts.inProgress}</Text>
      <Text testID="filteredIds">{hook.filtered.map((c: any) => c.id).join(',')}</Text>
      <TouchableOpacity testID="setInProgress" onPress={() => hook.setActiveTab('In Progress')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setAssigned" onPress={() => hook.setActiveTab('Assigned')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setCompleted" onPress={() => hook.setActiveTab('Completed')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="refresh" onPress={() => hook.fetchChallenges(true)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('useChallengesList — initial fetch', () => {
  test('fetches the main list and merges in real assigned-only challenges from other grades', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assigned')) return jsonRes([{ id: 'c-other-grade', status: 'assigned' }]);
      if (url.includes('/challenges?')) return jsonRes([{ id: 'c1', status: 'available' }, { id: 'c2', status: 'assigned' }]);
      return jsonRes([]);
    }) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('challengesCount').props.children).toBe(3); // 2 from main list + 1 merged
  });

  test('an already-present challenge id in the assigned list is not duplicated', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assigned')) return jsonRes([{ id: 'c1', status: 'assigned' }]);
      if (url.includes('/challenges?')) return jsonRes([{ id: 'c1', status: 'assigned' }]);
      return jsonRes([]);
    }) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('challengesCount').props.children).toBe(1);
  });

  test('no studentId -> skips the assigned-list fetch entirely, still loads the main list', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges?')) return jsonRes([{ id: 'c1', status: 'available' }]);
      return jsonRes([]);
    }) as any;

    await render(<Harness studentId={null} />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('challengesCount').props.children).toBe(1);
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/challenges/assigned'));
  });

  test('a non-ok main response leaves the list empty, no crash', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => [] }) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('challengesCount').props.children).toBe(0);
  });

  test('a network error is swallowed, loading still resolves to false', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<Harness />);
    // fetchWithRetry (3 attempts, backoff up to 400ms+800ms) needs more than
    // waitFor's default 1000ms budget when every single attempt fails.
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'), { timeout: 10000 });
    expect(screen.getByTestId('challengesCount').props.children).toBe(0);
  }, 15000);

  // Regression test for Bug #22's "no challenges available" report. RCA: a
  // bare single-attempt `fetch()` meant any ONE transient network blip (the
  // same class of intermittent flakiness already proven and fixed this
  // session for the Progress page and AI Coach suggestions, both now on
  // fetchWithRetry) permanently showed an empty "No challenges available"
  // state, even though the challenges genuinely existed.
  //
  // This hook also independently calls fetchChallenges() twice on mount
  // (once from its own effect, once from useFocusEffect) — a naive "one
  // rejection, does the count end up right?" test would pass by accident
  // via that redundant second call, without the fix actually being present.
  // So this asserts the real distinguishing signal instead: with a retry
  // helper in place, ONE failed attempt causes MORE than one fetch call to
  // the main challenges endpoint (its own internal retries), not just the
  // two calls the pre-existing double-invocation already produces.
  test('a single transient network failure triggers a real retry, not just relying on the double-fetch-on-mount to paper over it', async () => {
    let mainCalls = 0;
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assigned')) return jsonRes([]);
      if (url.includes('/challenges?')) {
        mainCalls++;
        if (mainCalls === 1) return Promise.reject(new Error('transient blip'));
        return jsonRes([{ id: 'c1', status: 'available' }]);
      }
      return jsonRes([]);
    }) as any;

    await render(<Harness />);

    // Wait on the retry count directly, not on `loading` — the OTHER
    // concurrent invocation (useEffect vs. useFocusEffect both fire on
    // mount) succeeds immediately and flips `loading` false well before the
    // failed invocation's own backoff-and-retry finishes in the background,
    // so gating on `loading` would let this assertion run too early to ever
    // observe the retry.
    await waitFor(() => expect(mainCalls).toBeGreaterThan(2), { timeout: 10000 });
    await waitFor(() => expect(screen.getByTestId('challengesCount').props.children).toBe(1), { timeout: 10000 });
  }, 15000);
});

describe('useChallengesList — tabs and counts', () => {
  test('initialTab="assigned" starts on the Assigned tab', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([])) as any;
    await render(<Harness initialTab="assigned" />);
    expect(screen.getByTestId('activeTab').props.children).toBe('Assigned');
  });

  test('defaults to the Available tab when no initialTab is given', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([])) as any;
    await render(<Harness />);
    expect(screen.getByTestId('activeTab').props.children).toBe('Available');
  });

  test('filtered and counts reflect the real per-status breakdown of the fetched challenges', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assigned')) return jsonRes([]);
      if (url.includes('/challenges?')) return jsonRes([
        { id: 'c1', status: 'available' }, { id: 'c2', status: 'available' },
        { id: 'c3', status: 'assigned' }, { id: 'c4', status: 'completed' },
      ]);
      return jsonRes([]);
    }) as any;

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(screen.getByTestId('availableCount').props.children).toBe(2);
    expect(screen.getByTestId('assignedCount').props.children).toBe(1);
    expect(screen.getByTestId('completedCount').props.children).toBe(1);
    expect(screen.getByTestId('filteredCount').props.children).toBe(2); // starts on Available tab
  });

  test('switching tabs re-filters to the real matching subset', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assigned')) return jsonRes([]);
      if (url.includes('/challenges?')) return jsonRes([{ id: 'c1', status: 'available' }, { id: 'c2', status: 'assigned' }]);
      return jsonRes([]);
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('setAssigned'));

    expect(screen.getByTestId('activeTab').props.children).toBe('Assigned');
    expect(screen.getByTestId('filteredCount').props.children).toBe(1);
  });

  test('switching to the Completed tab filters to only real completed challenges', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assigned')) return jsonRes([]);
      if (url.includes('/challenges?')) return jsonRes([
        { id: 'c1', status: 'available' }, { id: 'c2', status: 'completed' }, { id: 'c3', status: 'completed' },
      ]);
      return jsonRes([]);
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('setCompleted'));

    expect(screen.getByTestId('activeTab').props.children).toBe('Completed');
    expect(screen.getByTestId('filteredCount').props.children).toBe(2);
  });
});

describe('useChallengesList — refresh behavior', () => {
  test('calling fetchChallenges(true) re-fetches without resetting to the loading spinner', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assigned')) return jsonRes([]);
      if (url.includes('/challenges?')) return jsonRes([{ id: 'c1', status: 'available' }]);
      return jsonRes([]);
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    (global.fetch as jest.Mock).mockClear();
    await user.press(screen.getByTestId('refresh'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByTestId('loading').props.children).toBe('false'); // never flips back to true
  });

  test('refocusing the screen calls the real refreshProfile function', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([])) as any;
    const refreshProfile = jest.fn().mockResolvedValue(undefined);

    await render(<Harness refreshProfile={refreshProfile} />);

    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
  });

  test('a rejected refreshProfile call is swallowed, does not crash the screen', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([])) as any;
    const refreshProfile = jest.fn().mockRejectedValue(new Error('profile down'));

    await render(<Harness refreshProfile={refreshProfile} />);

    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
    expect(screen.getByTestId('loading').props.children).toBe('false');
  });
});

describe('useChallengesList — self-started vs assigned', () => {
  const list = [
    { id: 'self', status: 'assigned', assignedByRole: 'student' },
    { id: 'teacher', status: 'assigned', assignedByRole: 'teacher' },
    { id: 'parent', status: 'assigned', assignedByRole: 'parent' },
    { id: 'legacy', status: 'assigned', assignedByRole: null },
  ];

  beforeEach(() => {
    global.fetch = jest.fn((url: string) =>
      url.includes('/challenges?') ? jsonRes(list) : jsonRes([])) as any;
  });

  test('a challenge the student started themselves is not counted as Assigned', async () => {
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('assignedCount').props.children).toBe(3);
    expect(screen.getByTestId('inProgressCount').props.children).toBe(1);

    const user = userEvent.setup();
    await user.press(screen.getByTestId('setAssigned'));
    expect(screen.getByTestId('filteredIds').props.children).toBe('teacher,parent,legacy');
  });

  test('the In Progress tab lists only self-started challenges', async () => {
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    const user = userEvent.setup();
    await user.press(screen.getByTestId('setInProgress'));
    expect(screen.getByTestId('filteredIds').props.children).toBe('self');
  });
});
