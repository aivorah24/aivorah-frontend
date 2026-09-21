import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useDbTopic, type TopicByName } from '../useDbTopic';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ topicId, topicName, byName, enabled }: { topicId?: string; topicName?: string; byName?: TopicByName; enabled?: boolean }) {
  const h = useDbTopic(topicId, topicName, byName, enabled === undefined ? undefined : { enabled });
  return (
    <>
      <Text testID="loading">{String(h.loadingDbTopic)}</Text>
      <Text testID="name">{h.dbTopic?.name ?? ''}</Text>
      <Text testID="intro">{(h.dbTopic as any)?.readText?.intro ?? ''}</Text>
      <Text testID="bodyLen">{(h.dbTopic as any)?.readText?.body?.length ?? 0}</Text>
      <Text testID="figureUrl">{(h.dbTopic as any)?.readText?.figureUrl ?? ''}</Text>
    </>
  );
}

describe('useDbTopic', () => {
  test('with no real topicId, does not fetch and is never in a loading state', async () => {
    global.fetch = jest.fn() as any;
    await render(<Harness />);

    expect(screen.getByTestId('loading').props.children).toBe('false');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // Phantom-hook fix: LessonScreen.tsx passes enabled:false when the topic
  // is teacher-content-backed (route params already carry the content), so
  // this hook must not fire a fetch for a topicId/byName that has no
  // syllabus_topics row at all.
  test('with a real topicId but enabled:false, does not fetch even though it would otherwise be active', async () => {
    global.fetch = jest.fn() as any;
    await render(<Harness topicId="topic-123" enabled={false} />);

    expect(screen.getByTestId('loading').props.children).toBe('false');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('parses a real rich payload (intro/body/keyLearnings) into the real readText shape', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      resources: [
        { resourceType: 'AI_EXPLANATION', status: 'READY', payload: {
          intro: 'Once upon a time', body: ['line one', 'line two'], keyLearnings: ['k1'],
        } },
      ],
    })) as any;

    await render(<Harness topicId="t1" topicName="Fables" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('name').props.children).toBe('Fables');
    expect(screen.getByTestId('intro').props.children).toBe('Once upon a time');
    expect(screen.getByTestId('bodyLen').props.children).toBe(2);
  });

  test('parses a real legacy payload (just { text }) into intro, with an empty rich body', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      resources: [
        { resourceType: 'AI_EXPLANATION', status: 'READY', payload: { text: 'Legacy plain text lesson.' } },
      ],
    })) as any;

    await render(<Harness topicId="t2" topicName="Legacy Topic" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('intro').props.children).toBe('Legacy plain text lesson.');
    expect(screen.getByTestId('bodyLen').props.children).toBe(0);
  });

  test('pulls a real figureUrl from a READY IMAGES resource', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      resources: [
        { resourceType: 'AI_EXPLANATION', status: 'READY', payload: { intro: 'Hi' } },
        { resourceType: 'IMAGES', status: 'READY', payload: { items: [{ description: 'https://img/1.png' }] } },
      ],
    })) as any;

    await render(<Harness topicId="t3" topicName="With Image" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('figureUrl').props.children).toBe('https://img/1.png');
  });

  test('a real not-yet-READY explanation resolves to an empty readText, no crash', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      resources: [{ resourceType: 'AI_EXPLANATION', status: 'PENDING', payload: null }],
    })) as any;

    await render(<Harness topicId="t4" topicName="Pending Topic" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('intro').props.children).toBe('');
  });

  test('a real fetch failure stops loading without crashing (dbTopic stays null)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;

    await render(<Harness topicId="t5" topicName="Failing Topic" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('name').props.children).toBe('');
  });

  // Bug #8 (BUGS_AND_FIXES.md): a real NCERT/Qdrant-only topic with no DB id
  // (e.g. "Ability Beyond Disability") resolves via curriculum+grade+subject
  // +topic instead of a topicId, hitting the new topic-by-name route.
  describe('byName (Bug #8)', () => {
    const BY_NAME: TopicByName = { curriculum: 'NCERT', grade: 'Grade 9', subject: 'English', topic: 'Ability Beyond Disability' };

    test('fetches the topic-by-name route (not the topicId route) and resolves real content', async () => {
      global.fetch = jest.fn().mockResolvedValue(jsonRes({
        resources: [{ resourceType: 'AI_EXPLANATION', status: 'READY', payload: { intro: 'Ability Beyond Disability — intro.', body: [] } }],
      })) as any;

      await render(<Harness topicName="Ability Beyond Disability" byName={BY_NAME} />);

      await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
      expect(screen.getByTestId('intro').props.children).toBe('Ability Beyond Disability — intro.');
      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/teacher/syllabus/topic-by-name/resources');
      expect(calledUrl).toContain('topic=Ability');
      expect(calledUrl).not.toContain('/teacher/syllabus/topic/');
    });

    test('with neither topicId nor byName, does not fetch and is never in a loading state', async () => {
      global.fetch = jest.fn() as any;
      await render(<Harness topicName="Something" />);

      expect(screen.getByTestId('loading').props.children).toBe('false');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('topicId takes priority over byName when both are somehow present', async () => {
      global.fetch = jest.fn().mockResolvedValue(jsonRes({ resources: [] })) as any;
      await render(<Harness topicId="t1" topicName="X" byName={BY_NAME} />);
      await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(calledUrl).toContain('/teacher/syllabus/topic/t1/resources');
    });
  });
});
