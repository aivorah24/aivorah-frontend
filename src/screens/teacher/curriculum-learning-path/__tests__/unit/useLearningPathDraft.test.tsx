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

function RebuildHarness() {
  const h = useLearningPathDraft('c1');
  const topics = h.learningPath?.content.units[0].topics || [];
  return (
    <View>
      <Text testID="topics">{topics.map((t) => `${t.title}:${t.objectives.join(',')}`).join('|')}</Text>
      <TouchableOpacity testID="load" onPress={() => h.load()} />
      <TouchableOpacity testID="edit-other" onPress={() => h.updateContent({ ...h.learningPath!.content, units: [{ ...h.learningPath!.content.units[0], topics: [topics[0], { ...topics[1], objectives: ['local edit'] }] }] })} />
      <TouchableOpacity testID="rebuild" onPress={() => h.rebuildTopic(0, 0, [[]])} />
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

  test('rebuildTopic merges only the rebuilt topic, keeping unsaved edits elsewhere', async () => {
    const topic = (title: string, objectives: string[]) => ({ title, order: title === 'A' ? 0 : 1, objectives, lessons: [], subtopics: [] });
    const draft = { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: { version: 1, units: [{ title: 'U', order: 0, topics: [topic('A', ['old']), topic('B', ['old'])] }] } };
    const server = { ...draft, content: { version: 1, units: [{ title: 'U', order: 0, topics: [topic('A', ['rebuilt']), topic('B', ['old'])] }] } };
    global.fetch = jest.fn()
      .mockImplementationOnce(() => jsonResponse({ learningPath: draft }))
      .mockImplementationOnce(() => jsonResponse({ learningPath: server })) as any;
    const user = userEvent.setup();
    await render(<RebuildHarness />);
    await user.press(screen.getByTestId('load'));
    await waitFor(() => expect(screen.getByTestId('topics').props.children).toBe('A:old|B:old'));
    await user.press(screen.getByTestId('edit-other'));
    await user.press(screen.getByTestId('rebuild'));

    await waitFor(() => expect(screen.getByTestId('topics').props.children).toBe('A:rebuilt|B:local edit'));
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toBe('https://server.test/teacher-curriculum/c1/learning-path/topics/rebuild');
    expect(JSON.parse(opts.body)).toEqual({ unitOrder: 0, topicOrder: 0, subtopicSections: [[]] });
  });
});
