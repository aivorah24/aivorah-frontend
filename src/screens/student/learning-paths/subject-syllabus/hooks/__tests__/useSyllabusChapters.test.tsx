import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useSyllabusChapters } from '../useSyllabusChapters';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ curriculum = 'CBSE', grade = 'Grade 6', subject = 'English' }: any) {
  const h = useSyllabusChapters(curriculum, grade, subject);
  return (
    <>
      <Text testID="loadingDb">{String(h.loadingDb)}</Text>
      <Text testID="loadError">{String(h.loadError)}</Text>
      <Text testID="isDbBacked">{String(h.isDbBacked)}</Text>
      <Text testID="chapterCount">{h.chapters.length}</Text>
      <Text testID="firstTitle">{h.chapters[0]?.title ?? ''}</Text>
    </>
  );
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(jsonRes({ units: [] })) as any;
});

describe('useSyllabusChapters', () => {
  test('real teacher-published DB chapters take priority over the curated fallback', async () => {
    const units = [{ title: 'DB Chapter', topics: [{ id: 't1', name: 'DB Topic' }] }];
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ units })) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loadingDb').props.children).toBe('false'));
    expect(screen.getByTestId('isDbBacked').props.children).toBe('true');
    expect(screen.getByTestId('firstTitle').props.children).toBe('DB Chapter');
  });

  test('falls back to the real curated syllabus when the DB has nothing published', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ units: [] })) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loadingDb').props.children).toBe('false'));
    expect(screen.getByTestId('isDbBacked').props.children).toBe('false');
    expect(Number(screen.getByTestId('chapterCount').props.children)).toBeGreaterThan(0);
  });

  test('a real fetch failure sets loadError and still falls back to curated content, no crash', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loadingDb').props.children).toBe('false'));
    expect(screen.getByTestId('loadError').props.children).toBe('true');
    expect(Number(screen.getByTestId('chapterCount').props.children)).toBeGreaterThan(0);
  });

  test('an unsupported curriculum/grade/subject combo with nothing published returns a real empty chapter list', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ units: [] })) as any;

    await render(<Harness curriculum="IB PYP" grade="Grade 4" subject="Mathematics" />);

    await waitFor(() => expect(screen.getByTestId('loadingDb').props.children).toBe('false'));
    expect(screen.getByTestId('chapterCount').props.children).toBe(0);
  });
});
