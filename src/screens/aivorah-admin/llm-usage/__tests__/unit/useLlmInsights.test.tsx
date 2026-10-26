import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useLlmInsights } from '../../hooks/useLlmInsights';

jest.mock('../../services/llmStatsService', () => ({ fetchLlmInsights: jest.fn() }));
import { fetchLlmInsights } from '../../services/llmStatsService';

function Harness({ days }: { days: number }) {
  const h = useLlmInsights(days);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="text">{h.insights?.text ?? ''}</Text>
    </>
  );
}

describe('useLlmInsights', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads insights for the given range', async () => {
    (fetchLlmInsights as jest.Mock).mockResolvedValueOnce({ text: 'AI says hi', source: 'ai' });
    await render(<Harness days={7} />);
    await waitFor(() => expect(screen.getByTestId('text').props.children).toBe('AI says hi'));
    expect(screen.getByTestId('loading').props.children).toBe('false');
    expect(fetchLlmInsights).toHaveBeenCalledWith(7);
  });

  it('refetches when the range changes', async () => {
    (fetchLlmInsights as jest.Mock)
      .mockResolvedValueOnce({ text: 'seven', source: 'ai' })
      .mockResolvedValueOnce({ text: 'ninety', source: 'ai' });
    const view = await render(<Harness days={7} />);
    await waitFor(() => expect(screen.getByTestId('text').props.children).toBe('seven'));
    await view.rerender(<Harness days={90} />);
    await waitFor(() => expect(screen.getByTestId('text').props.children).toBe('ninety'));
    expect(fetchLlmInsights).toHaveBeenLastCalledWith(90);
  });

  it('exposes the error and stops loading on failure', async () => {
    (fetchLlmInsights as jest.Mock).mockRejectedValueOnce(new Error('nope'));
    await render(<Harness days={30} />);
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('nope'));
    expect(screen.getByTestId('loading').props.children).toBe('false');
  });
});
