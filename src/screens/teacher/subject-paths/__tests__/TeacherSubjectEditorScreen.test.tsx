import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import TeacherSubjectEditorScreen from '../TeacherSubjectEditorScreen';

jest.setTimeout(20000);

jest.mock('../../../../components/common/Header', () => {
  const { View, Text } = require('react-native');
  return { __esModule: true, default: (p: any) => <View><Text>{p.title}</Text></View> };
});
jest.mock('../../../../components/common/ScreenLayout', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', primary: '#fa0', accentGreen: '#0f0', accentYellow: '#ff0' } }),
}));
jest.mock('../../../../hooks/useResponsive', () => ({ useResponsive: () => ({ isMobile: false }) }));
jest.mock('../../../student/learning-paths/lesson-screen/LessonScreen', () => {
  const { View, Text } = require('react-native');
  return { __esModule: true, default: (p: any) => <View testID="student-view"><Text>{JSON.stringify(p.route.params.lessonEdits || null)}</Text></View> };
});
jest.mock('../components/pickLessonImage', () => ({ pickLessonImage: jest.fn(async () => 'https://img/p.png') }));
jest.mock('../../curriculum-learning-path/services/curriculumLearningPathService', () => ({ getBookSections: jest.fn(async () => ({ sections: [] })) }));

const BASE = [
  { title: 'Patterns', pdfFile: 'a.pdf', topics: [{ name: 'What is a pattern', kind: 'qdrant' }, { name: 'Number patterns', kind: 'qdrant' }] },
  { title: 'Angles', pdfFile: 'b.pdf', topics: [{ name: 'Point', kind: 'qdrant' }] },
];
jest.mock('../../../student/learning-paths/subject-syllabus/hooks/useSyllabusChapters', () => ({
  useSyllabusChapters: () => ({ chapters: BASE, isDbBacked: true, loadingDb: false, loadError: false }),
}));
jest.mock('../../../student/learning-paths/lesson-screen/hooks/useDbTopic', () => ({
  useDbTopic: () => ({
    rawPayload: { whatYoullLearn: ['Find patterns'], blocks: [{ type: 'explanation', text: 'A pattern repeats.' }], pdfFile: 'a.pdf', pdfPage: 3 },
    loadingDbTopic: false,
  }),
}));

const mockSave = jest.fn();
const mockPublish = jest.fn();
jest.mock('../services/subjectEditsService', () => ({
  getSubjectEdits: jest.fn(async () => ({ edits: { chapters: [], topics: {} }, status: 'none', updatedAt: null, publishedAt: null, hasUnpublishedChanges: false })),
  saveSubjectEdits: (...a: any[]) => mockSave(...a),
  publishSubjectEdits: (...a: any[]) => mockPublish(...a),
}));

const ROUTE = { params: { curriculum: 'CBSE', grade: 'Grade 6', subject: 'Mathematics' } };
const SCOPE = ROUTE.params;

beforeEach(() => {
  mockSave.mockReset().mockImplementation(async (_s: any, edits: any) => ({ edits, status: 'draft', updatedAt: '2026-09-30T10:00:00Z', publishedAt: null, hasUnpublishedChanges: false }));
  mockPublish.mockReset().mockResolvedValue({ edits: {}, status: 'published', updatedAt: '2026-09-30T10:01:00Z', publishedAt: '2026-09-30T10:01:00Z', hasUnpublishedChanges: false });
});

test('shows the standard path with the first lesson open for editing', async () => {
  await render(<TeacherSubjectEditorScreen route={ROUTE} />);
  expect(await screen.findByText('Standard path · make any change to start your version')).toBeTruthy();
  expect(screen.getAllByText('What is a pattern').length).toBeGreaterThan(0);
  expect(screen.getByTestId('objective-0').props.value).toBe('Find patterns');
  expect(screen.getByText('A pattern repeats.')).toBeTruthy();
});

test('hiding a chapter saves it on its own, then publishing sends it to students', async () => {
  await render(<TeacherSubjectEditorScreen route={ROUTE} />);
  await fireEvent.press(await screen.findByTestId('chapter-hide-1'));
  expect(await screen.findByText(/hidden from students/)).toBeTruthy();

  await waitFor(() => expect(mockSave).toHaveBeenCalled(), { timeout: 4000 });
  const saved = mockSave.mock.calls[0][1];
  expect(mockSave.mock.calls[0][0]).toEqual(SCOPE);
  expect(saved.chapters.find((c: any) => c.key === 'pdf:b.pdf').hidden).toBe(true);
  expect(await screen.findByText(/Draft saved/)).toBeTruthy();

  await fireEvent.press(screen.getByTestId('publish-subject'));
  await waitFor(() => expect(mockPublish).toHaveBeenCalledWith(SCOPE));
  expect(await screen.findByText(/students see this/)).toBeTruthy();
  expect(screen.getByTestId('toast')).toBeTruthy();
  expect(screen.getByText('Published to students')).toBeTruthy();
  expect(screen.getByText('Your Grade 6 students now see your Mathematics.')).toBeTruthy();
});

test('editing an objective and adding a key-points block makes the lesson the teacher version, shown in Student view', async () => {
  await render(<TeacherSubjectEditorScreen route={ROUTE} />);
  await fireEvent.changeText(await screen.findByTestId('objective-0'), 'Spot patterns around you');
  await fireEvent.press(screen.getAllByTestId('insert-open')[1]);
  await fireEvent.press(screen.getByTestId('insert-Key points'));
  await fireEvent.changeText(screen.getByTestId('field-items.0'), 'Patterns repeat');

  expect(await screen.findByText('Edited by you — students see your version')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('canvas-view'));
  const shown = JSON.parse(screen.getByTestId('student-view').props.children.props.children);
  expect(shown.whatYoullLearn).toEqual(['Spot patterns around you']);
  expect(shown.blocks[1]).toEqual({ type: 'key_points', items: ['Patterns repeat'] });
  expect(shown.pdfPage).toBe(3);

  await fireEvent.press(screen.getByTestId('reset-lesson'));
  expect(await screen.findByText('Standard lesson — edit anything to make it yours')).toBeTruthy();
});

test('a teacher can add their own topic and write its practice questions', async () => {
  await render(<TeacherSubjectEditorScreen route={ROUTE} />);
  await fireEvent.press(await screen.findByTestId('topic-add-0'));
  const input = screen.getByTestId('topic-add-input-0');
  await fireEvent.changeText(input, 'Patterns in rangoli');
  await fireEvent(input, 'submitEditing');
  await fireEvent.press(await screen.findByText('Patterns in rangoli'));

  expect(await screen.findByText('Your own topic')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('editor-tab-practice'));
  await fireEvent.press(screen.getByTestId('quiz-add'));
  await fireEvent.changeText(screen.getByTestId('quiz-question-0'), 'How many dots?');
  await fireEvent.press(screen.getByTestId('quiz-correct-0-2'));

  await waitFor(() => expect(mockSave).toHaveBeenCalled(), { timeout: 4000 });
  const last = mockSave.mock.calls[mockSave.mock.calls.length - 1][1];
  const added = last.chapters[0].topics.find((t: any) => t.added);
  expect(added.name).toBe('Patterns in rangoli');
  expect(last.topics[added.key].practiceQuiz[0]).toEqual(expect.objectContaining({ question: 'How many dots?', correctIndex: 2 }));
});
