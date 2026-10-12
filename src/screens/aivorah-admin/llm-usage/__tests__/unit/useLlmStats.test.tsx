import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useLlmStats } from '../../hooks/useLlmStats';

jest.mock('../../services/llmStatsService', () => ({ fetchLlmStats: jest.fn() }));
import { fetchLlmStats } from '../../services/llmStatsService';

function Harness() {
  const h = useLlmStats(); // self-loads on mount and whenever days changes
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="days">{h.days}</Text>
      <Text testID="calls">{h.data?.summary.totalCalls ?? ''}</Text>
      <TouchableOpacity testID="set90" onPress={() => h.setDays(90)}><Text>90</Text></TouchableOpacity>
    </>
  );
}

describe('useLlmStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads stats for the default 30-day window', async () => {
    (fetchLlmStats as jest.Mock).mockResolvedValueOnce({ summary: { totalCalls: 12 } });
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('calls').props.children).toBe(12);
    expect(fetchLlmStats).toHaveBeenCalledWith(30);
  });

  it('reloads when days changes', async () => {
    (fetchLlmStats as jest.Mock)
      .mockResolvedValueOnce({ summary: { totalCalls: 12 } })
      .mockResolvedValueOnce({ summary: { totalCalls: 40 } });
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('calls').props.children).toBe(12));
    await user.press(screen.getByTestId('set90'));
    await waitFor(() => expect(screen.getByTestId('calls').props.children).toBe(40));
    expect(fetchLlmStats).toHaveBeenLastCalledWith(90);
  });

  it('surfaces a load error', async () => {
    (fetchLlmStats as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('boom'));
  });
});
