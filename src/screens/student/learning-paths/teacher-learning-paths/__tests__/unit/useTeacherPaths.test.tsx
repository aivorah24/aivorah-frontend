import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useTeacherPaths } from '../../hooks/useTeacherPaths';

const mockList = jest.fn();
const mockGet = jest.fn();
jest.mock('../../services/studentLearningPathService', () => ({
  listTeacherLearningPaths: (...a: any[]) => mockList(...a),
  getTeacherLearningPath: (...a: any[]) => mockGet(...a),
}));

function Harness({ grade, subject }: { grade: string; subject?: string }) {
  const { paths, loaded } = useTeacherPaths(grade, subject);
  return <Text testID="out">{loaded ? paths.map((p) => `${p.summary.title}:${p.path.content.units.length}`).join('|') || 'none' : 'loading'}</Text>;
}

beforeEach(() => { mockList.mockReset(); mockGet.mockReset(); });

test('loads the published paths for the grade (and subject) with their units', async () => {
  mockList.mockResolvedValue({ learningPaths: [{ id: 'lp1', curriculumId: 'c1', title: 'Grade 6 Mathematics', publishedAt: 'x' }] });
  mockGet.mockResolvedValue({ learningPath: { id: 'lp1', curriculumId: 'c1', publishedAt: 'x', content: { version: 1, units: [{}, {}, {}] } } });
  await render(<Harness grade="Grade 6" subject="Mathematics" />);
  await waitFor(() => expect(screen.getByTestId('out').props.children).toBe('Grade 6 Mathematics:3'));
  expect(mockList).toHaveBeenCalledWith({ grade: 'Grade 6', subject: 'Mathematics' });
  expect(mockGet).toHaveBeenCalledWith('c1');
});

test('without a subject it asks for every subject of the grade; a failure reads as no teacher paths', async () => {
  mockList.mockRejectedValue(new Error('offline'));
  await render(<Harness grade="Grade 4" />);
  await waitFor(() => expect(screen.getByTestId('out').props.children).toBe('none'));
  expect(mockList).toHaveBeenCalledWith({ grade: 'Grade 4' });
});
