import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
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
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('curriculum=IB_PYP'));
  });

  test('a non-IB curriculum hits the NCERT endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 4" userCurriculum="CBSE" />);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('curriculum=NCERT'));
  });

  test('no curriculum given -> treated as IB PYP by default', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: async () => ({ topics: [] }) });
    await render(<Harness userGrade="Grade 4" userCurriculum="" />);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('curriculum=IB_PYP'));
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
