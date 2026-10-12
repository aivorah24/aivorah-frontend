import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { usePlatformOverview } from '../../hooks/usePlatformOverview';

jest.mock('../../services/platformAdminOverviewService', () => ({
  fetchPlatformOverview: jest.fn(),
  fetchChartsData: jest.fn(async () => ({
    roleCounts: { student: 2, teacher: 1, parent: 1 }, curriculumMap: {}, gradeMap: {},
    onboarding: { student: { done: 2, total: 2 }, teacher: { done: 1, total: 1 }, parent: { done: 1, total: 1 } },
    topXP: [], assignmentStats: { total: 0, completed: 0, pending: 0, byType: {} }, assignmentsLast7: [],
  })),
}));
import { fetchPlatformOverview } from '../../services/platformAdminOverviewService';

const PAYLOAD = {
  counts: { users: 4, students: 2, teachers: 1, parents: 1, totalXP: 150, assignments: 2, assignmentsCompleted: 1 },
  students: [
    { id: 's1', name: 'Asha', email: 'a@x.test', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA', location: '', onboardingComplete: true, xpPoints: 100, level: 2, currentStreak: 3, studyTimeMinutes: 40, completedTopicsCount: 2, hasParent: true, teacherCount: 1, lastSeen: '2026-10-01T00:00:00Z' },
    { id: 's2', name: 'Ben', email: 'b@x.test', grade: 'Grade 6', curriculum: 'CBSE', school: '', location: '', onboardingComplete: false, xpPoints: 50, level: 1, currentStreak: 0, studyTimeMinutes: 10, completedTopicsCount: 0, hasParent: false, teacherCount: 0, lastSeen: null },
  ],
  teachers: [{ id: 't1', name: 'Ms Rao', email: 'rao@x.test', school: 'TSRA', location: '' }],
  parents: [{ id: 'p1', name: 'Mr Kumar', email: 'kumar@x.test', school: '', location: '' }],
};

function Harness() {
  const h = usePlatformOverview();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time load on mount, matching the screen's own useFocusEffect(load) pattern
  React.useEffect(() => { h.load(); }, []);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="b2bCount">{h.b2bStudents.length}</Text>
      <Text testID="b2cCount">{h.b2cStudents.length}</Text>
      <Text testID="schoolCount">{h.schoolCount}</Text>
      <Text testID="b2bShare">{h.b2bSharePct}</Text>
      <Text testID="drilldownCount">{h.schoolDrilldown.length}</Text>
      <Text testID="tsraStudents">{h.schoolDrilldown[0]?.students ?? ''}</Text>
      <Text testID="tsraTeachers">{h.schoolDrilldown[0]?.teachers ?? ''}</Text>
      <Text testID="tsraAvgXP">{h.schoolDrilldown[0]?.avgXP ?? ''}</Text>
      <Text testID="onboardingRate">{h.onboardingRatePct}</Text>
      <Text testID="avgStreak">{h.avgStreak}</Text>
      <Text testID="lastSeenCount">{h.lastSeenStudents.length}</Text>
      <Text testID="lastSeenFirst">{h.lastSeenStudents[0]?.id ?? ''}</Text>
      <TouchableOpacity testID="load" onPress={() => h.load()}><Text>load</Text></TouchableOpacity>
    </>
  );
}

describe('usePlatformOverview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('derives B2B/B2C split, school count, B2B share % and per-school drill-down from the overview payload', async () => {
    (fetchPlatformOverview as jest.Mock).mockResolvedValueOnce(PAYLOAD);
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(screen.getByTestId('b2bCount').props.children).toBe(1);
    expect(screen.getByTestId('b2cCount').props.children).toBe(1);
    expect(screen.getByTestId('schoolCount').props.children).toBe(1);
    expect(screen.getByTestId('b2bShare').props.children).toBe(50);
    expect(screen.getByTestId('drilldownCount').props.children).toBe(1);
    expect(screen.getByTestId('tsraStudents').props.children).toBe(1);
    expect(screen.getByTestId('tsraTeachers').props.children).toBe(1);
    expect(screen.getByTestId('tsraAvgXP').props.children).toBe(100);
    expect(screen.getByTestId('onboardingRate').props.children).toBe(50);
    expect(screen.getByTestId('avgStreak').props.children).toBe(2);
    expect(screen.getByTestId('lastSeenCount').props.children).toBe(1);
    expect(screen.getByTestId('lastSeenFirst').props.children).toBe('s1');
  });

  it('surfaces a load error message and does not crash on a B2C-only platform (no schools)', async () => {
    (fetchPlatformOverview as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('Unauthorized');
    expect(screen.getByTestId('drilldownCount').props.children).toBe(0);
  });

  it('reload() re-fetches and clears a previous error', async () => {
    (fetchPlatformOverview as jest.Mock)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(PAYLOAD);
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('boom'));

    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe(''));
    expect(screen.getByTestId('b2bCount').props.children).toBe(1);
  });
});
