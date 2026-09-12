import React from 'react';
import { View, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useTeacherLearningPath } from '../../hooks/useTeacherLearningPath';

jest.mock('../../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../../config/learningPathsServerUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function jsonResponse(body: any, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

function Harness() {
  const h = useTeacherLearningPath('c1');
  return (
    <View>
      <Text testID="status">{h.status}</Text>
      <Text testID="error">{h.errorMessage}</Text>
      <Text testID="units">{String(h.learningPath?.content.units.length ?? -1)}</Text>
    </View>
  );
}

describe('useTeacherLearningPath', () => {
  test('loads a published learning path', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      learningPath: { id: 'lp1', curriculumId: 'c1', publishedAt: 'x', content: { version: 1, units: [{ title: 'U', order: 0, topics: [] }] } },
    })) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('ok'));
    expect(screen.getByTestId('units').props.children).toBe('1');
  });

  test('sets status not_found on a 404', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'No published learning path found' }, false, 404)) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('not_found'));
  });

  test('sets status forbidden on a 403', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'Not authorized for this learning path' }, false, 403)) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('forbidden'));
  });

  test('sets status error on a 500', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'Failed to load the learning path' }, false, 500)) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('error'));
    expect(screen.getByTestId('error').props.children).toBe('Failed to load the learning path');
  });
});
