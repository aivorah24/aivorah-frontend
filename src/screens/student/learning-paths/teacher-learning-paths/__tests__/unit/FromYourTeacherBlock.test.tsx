import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import FromYourTeacherBlock from '../../components/FromYourTeacherBlock';

const mockList = jest.fn();
const mockGet = jest.fn();
jest.mock('../../services/studentLearningPathService', () => ({
  listTeacherLearningPaths: (...a: any[]) => mockList(...a),
  getTeacherLearningPath: (...a: any[]) => mockGet(...a),
}));

const colors: any = { primary: '#fa0', textMain: '#fff', textMuted: '#888', borderColor: '#333', cardDark: '#111' };
const content = {
  version: 1,
  metadata: { grade: '6', subject: 'Mathematics', curriculum: 'CBSE' },
  units: [{ title: 'Number Systems', order: 0, topics: [
    { title: 'Knowing Our Numbers', order: 0, objectives: [], lessons: [], subtopics: [], content: { whatYoullLearn: ['x'], blocks: [] } },
    { title: 'Not ready', order: 1, objectives: [], lessons: [], subtopics: [], content: null },
  ] }],
};

beforeEach(() => { mockList.mockReset(); mockGet.mockReset(); });

test("shows the teacher's path for this grade and subject; a topic opens the lesson screen with its content", async () => {
  mockList.mockResolvedValue({ learningPaths: [{ id: 'lp1', curriculumId: 'c1', title: 'Grade 6 Mathematics', publishedAt: 'x' }] });
  mockGet.mockResolvedValue({ learningPath: { id: 'lp1', curriculumId: 'c1', publishedAt: 'x', content } });
  const navigation = { navigate: jest.fn() };
  const user = userEvent.setup();
  await render(<FromYourTeacherBlock grade="Grade 6" subject="Mathematics" curriculum="CBSE" colors={colors} navigation={navigation} />);

  await waitFor(() => expect(screen.getByText('Grade 6 Mathematics')).toBeTruthy());
  expect(mockList).toHaveBeenCalledWith({ grade: 'Grade 6', subject: 'Mathematics' });
  expect(screen.getByText('FROM YOUR TEACHER')).toBeTruthy();
  expect(screen.getByText('Number Systems')).toBeTruthy();

  await user.press(screen.getByTestId('teacher-topic-c1-0-0'));
  expect(navigation.navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({
    grade: 'Grade 6', subject: 'Mathematics', curriculum: 'CBSE', topicName: 'Knowing Our Numbers', chapterTitle: 'Number Systems',
    teacherContent: content.units[0].topics[0].content,
  }));

  await user.press(screen.getByTestId('teacher-topic-c1-0-1'));
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
});

test('renders nothing when the teacher has not published for this subject, or the request fails', async () => {
  mockList.mockResolvedValueOnce({ learningPaths: [] });
  const first = await render(<FromYourTeacherBlock grade="Grade 6" subject="Science" curriculum="CBSE" colors={colors} navigation={{}} />);
  await waitFor(() => expect(mockList).toHaveBeenCalled());
  expect(screen.queryByTestId('from-your-teacher')).toBeNull();
  first.unmount();

  mockList.mockRejectedValueOnce(new Error('offline'));
  await render(<FromYourTeacherBlock grade="Grade 6" subject="Science" curriculum="CBSE" colors={colors} navigation={{}} />);
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  expect(screen.queryByTestId('from-your-teacher')).toBeNull();
});
