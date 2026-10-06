import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useParentDashboardData } from '../../hooks/useParentDashboardData';
jest.mock('../../../../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok') } },
}));


function jsonRes(data: any) {
  return Promise.resolve({ ok: true, json: async () => data });
}

function makeNavigation() {
  const listeners: Record<string, (() => void)[]> = { focus: [], blur: [] };
  return {
    addListener: (event: 'focus' | 'blur', cb: () => void) => {
      listeners[event].push(cb);
      return () => { listeners[event] = listeners[event].filter((l) => l !== cb); };
    },
    __fire: (event: 'focus' | 'blur') => listeners[event].forEach((cb) => cb()),
  };
}

function Harness({ parentEmail, route, navigation, isB2B }: any) {
  const h = useParentDashboardData({ parentEmail, route, navigation, isB2B });
  return (
    <>
      <Text testID="childrenLoading">{String(h.childrenLoading)}</Text>
      <Text testID="childrenCount">{h.children.length}</Text>
      <Text testID="selectedChildId">{h.selectedChild.id}</Text>
      <Text testID="selectedChildName">{h.selectedChild.name}</Text>
      <Text testID="weeklyActivity">{JSON.stringify(h.weeklyActivity)}</Text>
      <Text testID="assignmentsCount">{h.assignments.length}</Text>
      <Text testID="attendance">{h.attendanceSummary ? 'present' : 'null'}</Text>
    </>
  );
}

function child(overrides: Record<string, any> = {}) {
  return {
    id: 'c1', name: 'Anaya', grade: 'Grade 4', curriculum: 'IB PYP', school: 'TSRA',
    totalTopics: 20, xpPoints: 500, completedTopics: ['Fractions'], currentStreak: 3,
    studyTimeMinutes: 60, assignmentsDone: 2, challengesCompleted: 1, lastLesson: 'Decimals',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('useParentDashboardData', () => {
  test('loads the real first child by default when no childId param is given', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/children')) return jsonRes([child({ id: 'c1', name: 'Anaya' }), child({ id: 'c2', name: 'Rohan' })]);
      return jsonRes({});
    }) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={false} />);

    await waitFor(() => expect(screen.getByTestId('childrenLoading').props.children).toBe('false'));
    expect(screen.getByTestId('childrenCount').props.children).toBe(2);
    expect(screen.getByTestId('selectedChildId').props.children).toBe('c1');
  });

  test('a real childId route param selects that specific child, not just the first', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/children')) return jsonRes([child({ id: 'c1', name: 'Anaya' }), child({ id: 'c2', name: 'Rohan' })]);
      return jsonRes({});
    }) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: { childId: 'c2' } }} navigation={navigation} isB2B={false} />);

    await waitFor(() => expect(screen.getByTestId('selectedChildName').props.children).toBe('Rohan'));
  });

  test('no real linked children -> loading resolves false with an empty list, not stuck loading forever', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([])) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={false} />);

    await waitFor(() => expect(screen.getByTestId('childrenLoading').props.children).toBe('false'));
    expect(screen.getByTestId('childrenCount').props.children).toBe(0);
  });

  test('a network failure on the children fetch resolves loading=false, not stuck forever', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={false} />);

    await waitFor(() => expect(screen.getByTestId('childrenLoading').props.children).toBe('false'));
  });

  test('once a real child is selected, real weekly activity + assignments load for that child', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/children')) return jsonRes([child()]);
      if (url.includes('/weekly')) return jsonRes({ days: [{ day: 'Mon', studyMinutes: 30 }] });
      if (url.includes('/assignments')) return jsonRes([{ id: 'a1', title: 'Worksheet', subject: 'Math', dueDate: '2026-09-01', status: 'pending' }]);
      return jsonRes({});
    }) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={false} />);

    await waitFor(() => expect(screen.getByTestId('assignmentsCount').props.children).toBe(1));
    const activity = JSON.parse(screen.getByTestId('weeklyActivity').props.children);
    expect(activity[0]).toBe(30); // Monday's real real study minutes, mapped into WEEK_DAYS_ORDER position 0
  });

  // Real business rule from the hook: attendance is a B2B (school-linked)
  // feature only — a B2C parent must never see it fetched/populated.
  test('a B2C parent (isB2B=false) never fetches attendance — stays null', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/children')) return jsonRes([child()]);
      if (url.includes('/attendance')) return jsonRes({ summary: { present: 10 } });
      return jsonRes({});
    }) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={false} />);

    await waitFor(() => expect(screen.getByTestId('selectedChildId').props.children).toBe('c1'));
    expect(screen.getByTestId('attendance').props.children).toBe('null');
  });

  test('a B2B parent (isB2B=true) fetches real attendance for the selected child', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/children')) return jsonRes([child()]);
      if (url.includes('/attendance')) return jsonRes({ summary: { present: 10 } });
      return jsonRes({});
    }) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={true} />);

    await waitFor(() => expect(screen.getByTestId('attendance').props.children).toBe('present'));
  });

  // Real bug-prevention: a B2B response with no real `summary` key must not
  // be treated as real attendance data.
  test('a B2B attendance response with no real summary is treated as no data, not fake-populated', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/children')) return jsonRes([child()]);
      if (url.includes('/attendance')) return jsonRes({});
      return jsonRes({});
    }) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={true} />);

    await waitFor(() => expect(screen.getByTestId('selectedChildId').props.children).toBe('c1'));
    expect(screen.getByTestId('attendance').props.children).toBe('null');
  });

  test('a real "focus" navigation event re-fetches the real children list', async () => {
    let callCount = 0;
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/children')) { callCount++; return jsonRes([child({ name: `Anaya v${callCount}` })]); }
      return jsonRes({});
    }) as any;
    const navigation = makeNavigation();

    await render(<Harness parentEmail="parent@test.com" route={{ params: {} }} navigation={navigation} isB2B={false} />);
    await waitFor(() => expect(screen.getByTestId('selectedChildName').props.children).toBe('Anaya v1'));

    const callsBeforeFocus = callCount;
    navigation.__fire('focus');

    await waitFor(() => expect(callCount).toBeGreaterThan(callsBeforeFocus));
  });
});
