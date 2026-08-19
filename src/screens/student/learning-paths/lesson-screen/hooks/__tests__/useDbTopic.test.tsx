import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useDbTopic } from '../useDbTopic';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ topicId, topicName }: { topicId?: string; topicName?: string }) {
  const h = useDbTopic(topicId, topicName);
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
});
