import React from 'react';
import { View, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useTeacherLearningPaths } from '../../hooks/useTeacherLearningPaths';

jest.mock('../../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../../config/learningPathsServerUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function jsonResponse(body: any, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });
}

function Harness() {
  const h = useTeacherLearningPaths();
  return (
    <View>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="count">{String(h.learningPaths.length)}</Text>
    </View>
  );
}

describe('useTeacherLearningPaths', () => {
  test('loads and exposes the list', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ learningPaths: [{ id: 'lp1', curriculumId: 'c1', title: 'Maths', publishedAt: 'x' }] })) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    expect(screen.getByTestId('loading').props.children).toBe('false');
  });

  test('surfaces an empty list without error', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ learningPaths: [] })) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('count').props.children).toBe('0');
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  test('surfaces a server error', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'Failed to load learning paths' }, false)) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Failed to load learning paths'));
  });
});
