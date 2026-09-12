import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useLearningPathDraft } from '../../hooks/useLearningPathDraft';

jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../config/learningPathsServerUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

const CONTENT = { version: 1, units: [{ title: 'Numbers', order: 0, topics: [] }] };

function jsonResponse(body: any, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

function Harness() {
  const h = useLearningPathDraft('c1');
  return (
    <View>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="saving">{String(h.saving)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="status">{h.learningPath?.status ?? ''}</Text>
      <TouchableOpacity testID="load" onPress={() => h.load()} />
      <TouchableOpacity testID="save" onPress={() => h.save()} />
      <TouchableOpacity testID="publish" onPress={() => h.publish()} />
    </View>
  );
}

describe('useLearningPathDraft', () => {
  test('loads the draft', async () => {
    global.fetch = jest.fn().mockImplementation(() => jsonResponse({ learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: CONTENT } })) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('draft'));
  });

  test('surfaces a load error', async () => {
    global.fetch = jest.fn().mockImplementation(() => jsonResponse({ error: 'No draft learning path for this curriculum yet' }, false)) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('No draft learning path for this curriculum yet'));
  });

  test('saves edits by PUTting the current content', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, opts: any) => {
      if (opts?.method === 'PUT') return jsonResponse({ learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: CONTENT } });
      return jsonResponse({ learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: CONTENT } });
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('draft'));
    await user.press(screen.getByTestId('save'));
    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true));
  });

  test('surfaces a save error', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, opts: any) => {
      if (opts?.method === 'PUT') return jsonResponse({ error: 'units[0] missing numeric order' }, false);
      return jsonResponse({ learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: CONTENT } });
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('draft'));
    await user.press(screen.getByTestId('save'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('units[0] missing numeric order'));
  });

  test('publishes and reflects the published status', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, opts: any) => {
      if (opts?.method === 'POST') return jsonResponse({ learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'published', content: CONTENT } });
      return jsonResponse({ learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: CONTENT } });
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('draft'));
    await user.press(screen.getByTestId('publish'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('published'));
  });

  test('surfaces a publish error (e.g. invalid draft)', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, opts: any) => {
      if (opts?.method === 'POST') return jsonResponse({ error: 'Draft failed validation: content.units must be a non-empty array' }, false);
      return jsonResponse({ learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: CONTENT } });
    }) as any;

    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('status').props.children).toBe('draft'));
    await user.press(screen.getByTestId('publish'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toMatch(/Draft failed validation/));
  });
});
