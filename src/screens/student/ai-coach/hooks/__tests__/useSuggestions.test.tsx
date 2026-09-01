import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useSuggestions } from '../useSuggestions';

function Harness({ userGrade, userCurriculum }: { userGrade: string; userCurriculum: string }) {
  const suggestions = useSuggestions(userGrade, userCurriculum);
  return <Text testID="suggestions">{JSON.stringify(suggestions)}</Text>;
}

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('useSuggestions', () => {
  test('starts with the real fallback suggestions for the given grade', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 4" userCurriculum="IB PYP" />);
    const result = JSON.parse(screen.getByTestId('suggestions').props.children);
    expect(result).toContain('What are fractions?');
  });

  test('an unknown grade falls back to the Grade 3 suggestion set', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 99" userCurriculum="IB PYP" />);
    const result = JSON.parse(screen.getByTestId('suggestions').props.children);
    expect(result).toContain('What is colour theory?');
  });

  test('an IB PYP curriculum hits the IB_PYP endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 4" userCurriculum="IB PYP" />);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('curriculum=IB_PYP'), expect.anything());
  });

  test('a non-IB curriculum hits the NCERT endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 4" userCurriculum="CBSE" />);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('curriculum=NCERT'), expect.anything());
  });

  test('no curriculum given -> treated as IB PYP by default', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 4" userCurriculum="" />);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('curriculum=IB_PYP'), expect.anything());
  });

  test('real topics from the server replace the fallback, one question per subject, capped at 6', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        topics: [
          { subject: 'Mathematics', topic: 'Fractions' },
          { subject: 'Mathematics', topic: 'Decimals' }, // 2nd Maths topic ignored - only first per subject
          { subject: 'Science', topic: 'Photosynthesis' },
        ],
      }),
    });
    await render(<Harness userGrade="Grade 4" userCurriculum="IB PYP" />);
    const result = await screen.findByTestId('suggestions');
    const suggestions = JSON.parse(result.props.children);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toContain('Fractions');
    expect(suggestions[1]).toContain('Photosynthesis');
  });

  test('Bug #14: a raw PDF-code topic ("aemr101") is skipped for the real one that follows in the same subject', async () => {
    // Exact shape reproduced live against the real /curriculum endpoint
    // (Grade 1 NCERT): the first ingested Mathematics topic for that
    // grade/subject is a raw, unfiltered PDF filename code, not a real
    // chapter title — must not become an AI Coach suggestion chip.
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        topics: [
          { subject: 'Mathematics', topic: 'aemr101' },
          { subject: 'Mathematics', topic: 'Addition' },
          { subject: 'English', topic: '[IMAGE]' },
          { subject: 'English', topic: 'Animals Around Us' },
        ],
      }),
    });
    await render(<Harness userGrade="Grade 1" userCurriculum="CBSE" />);
    const result = await screen.findByTestId('suggestions');
    const suggestions = JSON.parse(result.props.children);
    expect(suggestions.some((s: string) => s.includes('aemr101'))).toBe(false);
    expect(suggestions.some((s: string) => s.includes('[IMAGE]'))).toBe(false);
    expect(suggestions.some((s: string) => s.includes('Addition'))).toBe(true);
    expect(suggestions.some((s: string) => s.includes('Animals Around Us'))).toBe(true);
  });

  test('a subject whose only ingested topic is a raw PDF code contributes no suggestion at all, rather than a garbled one', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        topics: [
          { subject: 'Hindi', topic: 'bhsr101' },
          { subject: 'Mathematics', topic: 'Fractions' },
        ],
      }),
    });
    await render(<Harness userGrade="Grade 2" userCurriculum="CBSE" />);
    const result = await screen.findByTestId('suggestions');
    const suggestions = JSON.parse(result.props.children);
    expect(suggestions.some((s: string) => s.includes('bhsr101'))).toBe(false);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toContain('Fractions');
  });

  test('BUG: a Grade 9 student never gets real curriculum-scoped suggestions if the first fetch attempt hits a transient network blip', async () => {
    // Reproduces the real-world report: header correctly showed "Grade 9
    // curriculum · CBSE" (userGrade/userCurriculum are fine), but the chips
    // showed the generic Grade 3 fallback set ("What is colour theory?")
    // instead of real Grade 9 topics. Root cause: a single-attempt fetch
    // with a silent `catch(() => {})` and no retry — on this real machine,
    // a plain curl straight at the backing service showed ~1-in-6 requests
    // stall/fail transiently (see StudentDataContext's fetchWithRetry fix,
    // same root cause class). One bad attempt here means the student is
    // stuck on 3rd-grade suggestions for the rest of the session, with a
    // grade the fallback set doesn't even cover (only Grade 3/4/5 exist).
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('transient network blip'))
      .mockResolvedValueOnce({
        json: async () => ({
          topics: [
            { subject: 'Mathematics', topic: 'Algebraic Identities' },
            { subject: 'English', topic: 'Ability Beyond Disability' },
          ],
        }),
      });
    await render(<Harness userGrade="Grade 9" userCurriculum="CBSE" />);
    // The retry has a real (unmocked) short backoff delay between attempts,
    // so unlike the other tests here, the real suggestions don't necessarily
    // exist by the time the testID first renders — waitFor polls until the
    // retried attempt has actually landed.
    await waitFor(() => {
      const suggestions = JSON.parse(screen.getByTestId('suggestions').props.children);
      expect(suggestions.some((s: string) => s.includes('Algebraic Identities'))).toBe(true);
    }, { timeout: 3000 });
    const suggestions = JSON.parse(screen.getByTestId('suggestions').props.children);
    expect(suggestions.some((s: string) => s.includes('colour theory'))).toBe(false);
  });

  test('an empty topics list keeps the fallback suggestions, does not clear them', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 4" userCurriculum="IB PYP" />);
    const result = JSON.parse(screen.getByTestId('suggestions').props.children);
    expect(result.length).toBeGreaterThan(0);
  });

  test('a fetch failure keeps the fallback suggestions, no crash', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    await render(<Harness userGrade="Grade 4" userCurriculum="IB PYP" />);
    const result = JSON.parse(screen.getByTestId('suggestions').props.children);
    expect(result).toContain('What are fractions?');
  });
});
