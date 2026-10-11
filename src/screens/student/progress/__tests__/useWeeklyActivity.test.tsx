import React from 'react';
import { Text, View } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useWeeklyActivity } from '../hooks/useWeeklyActivity';

const mockFetchWeeklyActivity = jest.fn();
jest.mock('../services/progressService', () => ({
  fetchWeeklyActivity: (...args: any[]) => mockFetchWeeklyActivity(...args),
}));

function Harness({ studentId }: { studentId?: string }) {
  const { weeklyDays, loading } = useWeeklyActivity(studentId);
  return (
    <View>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="daysCount">{weeklyDays.length}</Text>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchWeeklyActivity.mockResolvedValue({ days: [{ date: '2026-01-01', day: 'Mon', studyMinutes: 0, xp: 0, topicsCompleted: 0 }] });
});

describe('useWeeklyActivity', () => {
  test('fetches the real week for the student and stops loading', async () => {
    await render(<Harness studentId="s1" />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(mockFetchWeeklyActivity).toHaveBeenCalledWith('s1');
    expect(screen.getByTestId('daysCount')).toHaveTextContent('1');
  });

  test('stays loading with no fetch until a studentId resolves', async () => {
    await render(<Harness />);

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(mockFetchWeeklyActivity).not.toHaveBeenCalled();
  });
});
