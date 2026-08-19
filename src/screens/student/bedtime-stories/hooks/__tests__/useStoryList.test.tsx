// Unit test for useStoryList — covers grouping-by-collection. Premium/
// locking (isLocked, freeIds) was removed from the hook — Bedtime Stories
// premium gating is out of scope for this feature.

import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useStoryList } from '../useStoryList';

const STORIES = [
  { id: 'ambarisha', title: 'Ambarisha Maharaja', collection: 'Srimad Bhagavatam' },
  { id: 'dhruva', title: 'Dhruva', collection: 'Srimad Bhagavatam' },
  { id: 'ramayana-1', title: 'The Golden Deer', collection: 'Ramayana' },
];

function Harness() {
  const { loading, error, grouped } = useStoryList();
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="error">{error}</Text>
      <Text testID="collections">{JSON.stringify(Object.keys(grouped))}</Text>
      <Text testID="bhagavatamCount">{String(grouped['Srimad Bhagavatam']?.length ?? 0)}</Text>
    </>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('useStoryList', () => {
  test('groups stories by collection', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => STORIES });
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(JSON.parse(screen.getByTestId('collections').props.children)).toEqual(
      expect.arrayContaining(['Srimad Bhagavatam', 'Ramayana'])
    );
    expect(screen.getByTestId('bhagavatamCount').props.children).toBe('2');
  });

  test('a fetch failure sets the real error message, stops loading', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    await render(<Harness />);
    expect(await screen.findByText('Could not load stories. Please try again.')).toBeTruthy();
  });

  test('no email/collection field surprises -> an empty story list produces an empty grouped map', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => [] });
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('collections').props.children).toBe('[]');
  });
});
