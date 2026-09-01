import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useWeeklyActivity } from '../hooks/useWeeklyActivity';

const mockFetchWeeklyActivity = jest.fn();
jest.mock('../services/progressService', () => ({
  fetchWeeklyActivity: (...args: any[]) => mockFetchWeeklyActivity(...args),
}));

function Harness({ studentId = 's1' }: { studentId?: string }) {
  const { periodTab, setPeriodTab, weeklyDays, loading } = useWeeklyActivity(studentId);
  return (
    <View>
      <Text testID="periodTab">{periodTab}</Text>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="daysCount">{weeklyDays.length}</Text>
      <TouchableOpacity testID="switchToMonth" onPress={() => setPeriodTab('Month')}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchWeeklyActivity.mockResolvedValue({ days: [{ date: '2026-01-01', day: 'Mon', studyMinutes: 0, xp: 0, topicsCompleted: 0 }] });
});

describe('useWeeklyActivity — the Month tab bug', () => {
  test('a real switch to Month re-fetches with the real "Month" period, not just changing the button highlight', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(mockFetchWeeklyActivity).toHaveBeenCalledWith('s1', 'Week'));

    mockFetchWeeklyActivity.mockClear();
    mockFetchWeeklyActivity.mockResolvedValue({
      days: [
        { date: '2026-01-01', day: 'Wk 1', studyMinutes: 10, xp: 20, topicsCompleted: 1 },
        { date: '2026-01-08', day: 'Wk 2', studyMinutes: 0, xp: 0, topicsCompleted: 0 },
        { date: '2026-01-15', day: 'Wk 3', studyMinutes: 0, xp: 0, topicsCompleted: 0 },
        { date: '2026-01-22', day: 'Wk 4', studyMinutes: 0, xp: 0, topicsCompleted: 0 },
      ],
    });

    await user.press(screen.getByTestId('switchToMonth'));

    expect(screen.getByTestId('periodTab')).toHaveTextContent('Month');
    // The real bug: this fetch call must actually happen with 'Month'.
    await waitFor(() => expect(mockFetchWeeklyActivity).toHaveBeenCalledWith('s1', 'Month'));
    await waitFor(() => expect(screen.getByTestId('daysCount')).toHaveTextContent('4'));
  });

  test('switching to Month shows a loading state while the new data is fetched', async () => {
    const user = userEvent.setup();
    let resolveMonth: (v: any) => void = () => {};
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    mockFetchWeeklyActivity.mockReturnValue(new Promise((resolve) => { resolveMonth = resolve; }));
    await user.press(screen.getByTestId('switchToMonth'));

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    resolveMonth({ days: [] });
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  });
});
