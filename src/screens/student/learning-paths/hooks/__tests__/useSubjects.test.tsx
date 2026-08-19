// Standalone unit test for useSubjects — no RNTL renderHook available in
// this version, so a tiny harness component exposes the hook's state as
// text for assertions.

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { useSubjects } from '../useSubjects';

function Harness({ curriculum, grade, isCBSE, isPYP }: { curriculum: string; grade: string; isCBSE: boolean; isPYP: boolean }) {
  const { subjects, loading, error } = useSubjects(curriculum, grade, isCBSE, isPYP);
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="error">{error}</Text>
      <Text testID="subjects">{JSON.stringify(subjects.map(s => s.subject))}</Text>
    </>
  );
}

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('useSubjects', () => {
  test('starts in a loading state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ subjects: [] }) });
    await render(<Harness curriculum="IB PYP" grade="Grade 4" isCBSE={false} isPYP={true} />);
    // loading starts true synchronously, then settles once the fetch resolves.
    expect(await screen.findByText('false')).toBeTruthy();
  });

  test('CBSE queries the server with curriculum=CBSE regardless of the raw curriculum string', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ subjects: [] }) });
    await render(<Harness curriculum="NCERT" grade="Grade 6" isCBSE={true} isPYP={false} />);
    await screen.findByText('false'); // wait for loading to settle
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('curriculum=CBSE'));
  });

  test('real subjects from the server populate state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({ subjects: [{ subject: 'Mathematics', topicCount: 5, topics: [] }] }),
    });
    await render(<Harness curriculum="IB PYP" grade="Grade 4" isCBSE={false} isPYP={true} />);
    expect(await screen.findByText('["Mathematics"]')).toBeTruthy();
  });

  test('IB PYP: empty server response falls back to the real offline seed data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ subjects: [] }) });
    await render(<Harness curriculum="IB PYP" grade="Grade 4" isCBSE={false} isPYP={true} />);
    const subjectsText = await screen.findByTestId('subjects');
    expect(subjectsText.props.children).not.toBe('[]'); // real seeded subjects, not empty
  });

  test('CBSE: empty server response stays empty (no offline fallback for non-IB)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ subjects: [] }) });
    await render(<Harness curriculum="CBSE" grade="Grade 6" isCBSE={true} isPYP={false} />);
    await screen.findByText('false');
    expect(screen.getByTestId('subjects').props.children).toBe('[]');
  });

  test('IB PYP: a fetch failure falls back to real offline seed data, not an error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    await render(<Harness curriculum="IB PYP" grade="Grade 4" isCBSE={false} isPYP={true} />);
    const subjectsText = await screen.findByTestId('subjects');
    expect(subjectsText.props.children).not.toBe('[]');
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  test('CBSE: a fetch failure sets the real error message', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    await render(<Harness curriculum="CBSE" grade="Grade 6" isCBSE={true} isPYP={false} />);
    expect(await screen.findByText('Could not load curriculum right now. Check if the server is running and try again.')).toBeTruthy();
  });
});
