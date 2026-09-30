import React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, userEvent, fireEvent } from '@testing-library/react-native';
import TeacherLearningPathsManageScreen from '../../TeacherLearningPathsManageScreen';

jest.mock('../../../../../components/common/Header', () => {
  const { View, Text } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="header-stub"><Text>{props.title}</Text></View> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});
jest.mock('../../../../student/learning-paths/lesson-screen/LessonScreen', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="lesson-view" /> };
});

jest.mock('../../../subject-paths/components/TeacherSubjectCards', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="subject-cards" /> };
});

const mockListMyLearningPaths = jest.fn();
jest.mock('../../services/curriculumLearningPathService', () => ({
  getBookSections: jest.fn(),
  listMyLearningPaths: (...a: any[]) => mockListMyLearningPaths(...a),
  deleteLearningPath: jest.fn(),
}));

const mockUseLearningPathDraft = jest.fn();
const mockDraftFor: string[] = [];
jest.mock('../../hooks/useLearningPathDraft', () => ({
  useLearningPathDraft: (id: string) => { mockDraftFor.push(id); return mockUseLearningPathDraft(id); },
}));

function draftReturn(overrides = {}) {
  return {
    learningPath: null, loading: false, saving: false, publishing: false, error: '',
    dirty: false, isPublished: false, hasUnpublishedChanges: false,
    load: jest.fn(), updateContent: jest.fn(), rebuildTopic: jest.fn(), save: jest.fn().mockResolvedValue(true), publish: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}
const lp = (extra: any = {}, topics: any[] = []) => ({
  id: 'lp1', curriculum_id: 'c1', status: 'draft', updated_at: '2026-09-29T10:00:00Z',
  content: { version: 1, metadata: { grade: '6', subject: 'Mathematics' }, units: [{ title: 'U', order: 0, topics }] }, ...extra,
});
const topic = (t: any = {}) => ({ title: 'T', order: 0, objectives: [], lessons: [], subtopics: [], ...t });
const summary = (curriculumId: string, subject: string, extra = {}) => ({
  id: `lp-${curriculumId}`, curriculumId, title: `Grade 6 ${subject}`, fileName: 'x.docx', grade: '6', subject,
  status: 'draft', updatedAt: '2026-09-29T10:00:00Z', publishedAt: null, hasUnpublishedChanges: false, ...extra,
});

beforeEach(() => {
  mockDraftFor.length = 0;
  mockListMyLearningPaths.mockResolvedValue({ learningPaths: [] });
  mockUseLearningPathDraft.mockReturnValue(draftReturn());
});

describe('TeacherLearningPathsManageScreen (sidebar: Learning Paths)', () => {
  test('lists every path; opening one shows it for review and editing', async () => {
    mockListMyLearningPaths.mockResolvedValue({ learningPaths: [summary('c9', 'Mathematics', { status: 'published', publishedAt: '2026-09-29T09:00:00Z', hasUnpublishedChanges: true })] });
    mockUseLearningPathDraft.mockReturnValue(draftReturn({ learningPath: lp() }));
    const user = userEvent.setup();
    await render(<TeacherLearningPathsManageScreen route={{}} />);

    expect(screen.getByText('Learning Paths')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('my-path-c9')).toBeTruthy());
    expect(screen.getByTestId('my-path-status-c9').props.children).toBe('Published · edits not published yet');
    expect(screen.queryByTestId('learning-path-review')).toBeNull();

    await user.press(screen.getByTestId('open-path-c9'));
    await waitFor(() => expect(screen.getByTestId('learning-path-review')).toBeTruthy());
    expect(mockDraftFor).toContain('c9');
  });

  test('opened straight from Curriculum Upload with a curriculumId', async () => {
    mockUseLearningPathDraft.mockReturnValue(draftReturn({ learningPath: lp() }));
    await render(<TeacherLearningPathsManageScreen route={{ params: { curriculumId: 'c1' } }} />);
    await waitFor(() => expect(screen.getByTestId('learning-path-review')).toBeTruthy());
    expect(mockDraftFor).toContain('c1');
  });

  test('a teacher of Maths and Science filters the list by subject', async () => {
    mockListMyLearningPaths.mockResolvedValue({ learningPaths: [summary('m1', 'Mathematics'), summary('s1', 'Science')] });
    const user = userEvent.setup();
    await render(<TeacherLearningPathsManageScreen route={{}} />);
    await waitFor(() => expect(screen.getByTestId('my-path-s1')).toBeTruthy());

    await user.press(screen.getByTestId('paths-filter-Grade 6 Science'));
    expect(screen.queryByTestId('my-path-m1')).toBeNull();
    expect(screen.getByTestId('my-path-s1')).toBeTruthy();
    await user.press(screen.getByTestId('paths-filter-All'));
    expect(screen.getByTestId('my-path-m1')).toBeTruthy();
  });
});

describe('LearningPathWorkspace (the opened path)', () => {
  async function openWith(draft: any) {
    mockUseLearningPathDraft.mockReturnValue(draft);
    await render(<TeacherLearningPathsManageScreen route={{ params: { curriculumId: 'c1' } }} />);
    await waitFor(() => expect(screen.getByTestId('learning-path-review')).toBeTruthy());
  }

  test('name field suggests "Grade 6 Mathematics"; a draft is only visible to the teacher', async () => {
    await openWith(draftReturn({ learningPath: lp() }));
    expect(screen.getByTestId('learning-path-title').props.placeholder).toBe('Grade 6 Mathematics');
    expect(screen.getByTestId('save-state').props.children[0]).toBe('Draft · only you can see this');
  });

  test('typing a name updates metadata.title; unsaved edits are flagged', async () => {
    const updateContent = jest.fn();
    await openWith(draftReturn({ learningPath: lp(), updateContent, dirty: true }));
    await fireEvent.changeText(screen.getByTestId('learning-path-title'), 'Term 1 Maths');
    expect(updateContent.mock.calls[0][0].metadata).toEqual({ grade: '6', subject: 'Mathematics', title: 'Term 1 Maths' });
    expect(screen.getByTestId('save-state').props.children[1]).toBe(' · You have unsaved changes');
  });

  test('a published path with new edits offers "Publish updates"', async () => {
    await openWith(draftReturn({ learningPath: lp({ status: 'published' }), isPublished: true, hasUnpublishedChanges: true }));
    expect(screen.getByText('Publish updates')).toBeTruthy();
  });

  describe('publish guard', () => {
    beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    test('blocks publishing while topics still need the teacher\'s input', async () => {
      const publish = jest.fn().mockResolvedValue(true);
      await openWith(draftReturn({ learningPath: lp({}, [topic({ status: 'ready' }), topic({ order: 1, status: 'needs_teacher_input' }), topic({ order: 2, status: 'needs_teacher_input' })]), publish }));
      await userEvent.setup().press(screen.getByTestId('publish'));
      expect(Alert.alert).toHaveBeenCalledWith('Cannot publish yet', 'Please review and provide input for 2 topics marked "Needs Your Input".');
      expect(publish).not.toHaveBeenCalled();
    });

    test('publishes when every topic is ready (or predates the status field)', async () => {
      const publish = jest.fn().mockResolvedValue(true);
      await openWith(draftReturn({ learningPath: lp({}, [topic({ status: 'ready' }), topic({ order: 1 })]), publish }));
      await userEvent.setup().press(screen.getByTestId('publish'));
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(publish).toHaveBeenCalled();
    });
  });
});
