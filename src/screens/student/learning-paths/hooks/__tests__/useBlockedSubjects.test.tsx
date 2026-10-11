// Standalone unit test for useBlockedSubjects — harness component exposes
// the hook's returned Set as text for assertions.

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { useBlockedSubjects } from '../useBlockedSubjects';

function Harness({ email }: { email: string | undefined }) {
  const blocked = useBlockedSubjects(email);
  return <Text testID="blocked">{JSON.stringify([...blocked])}</Text>;
}

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('useBlockedSubjects', () => {
  test('no email -> never fetches, stays an empty set', async () => {
    await render(<Harness email={undefined} />);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('blocked').props.children).toBe('[]');
  });

  test('subjectFilter enabled -> returns the real blocked subject list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ subjectFilter: { enabled: true, blockedSubjects: ['Mathematics', 'Science'] } }),
    });
    await render(<Harness email="a@a.com" />);
    expect(await screen.findByText('["Mathematics","Science"]')).toBeTruthy();
  });

  test('subjectFilter disabled -> stays empty even if blockedSubjects has data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ subjectFilter: { enabled: false, blockedSubjects: ['Mathematics'] } }),
    });
    await render(<Harness email="a@a.com" />);
    // Give the effect a tick to run, then confirm it stayed empty.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId('blocked').props.children).toBe('[]');
  });

  test('a fetch failure leaves the set empty, does not crash', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    await render(<Harness email="a@a.com" />);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId('blocked').props.children).toBe('[]');
  });

  test('fetches the real per-child endpoint with the encoded email', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({}) });
    await render(<Harness email="a+test@a.com" />);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/parent/screen-time-status/a%2Btest%40a.com'));
  });
});

describe('useBlockedSubjects — data source (parental controls RCA)', () => {
  test('reads from the parental-controls service the parent saves to, not the monolith', async () => {
    const PARENTAL_CONTROLS_SERVER_URL = require('../../../../../config/parentalControlsServerUrl').default;
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ hasLimit: false }) });

    await render(<Harness email="kid@test.com" />);

    expect(global.fetch).toHaveBeenCalledWith(`${PARENTAL_CONTROLS_SERVER_URL}/parent/screen-time-status/kid%40test.com`);
  });
});
