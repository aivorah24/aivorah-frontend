import React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TeacherCurriculumLearningPathScreen from '../../TeacherCurriculumLearningPathScreen';

jest.mock('../../../../../components/common/Header', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="header-stub" /> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});

const mockUseCurriculumUpload = jest.fn();
jest.mock('../../hooks/useCurriculumUpload', () => ({
  useCurriculumUpload: () => mockUseCurriculumUpload(),
}));

const mockUseLearningPathDraft = jest.fn();
jest.mock('../../../../student/learning-paths/lesson-screen/LessonScreen', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="lesson-view" /> };
});
const mockListMyLearningPaths = jest.fn();
jest.mock('../../services/curriculumLearningPathService', () => ({
  getBookSections: jest.fn(),
  listMyLearningPaths: (...a: any[]) => mockListMyLearningPaths(...a),
  deleteLearningPath: jest.fn(),
}));
beforeEach(() => mockListMyLearningPaths.mockResolvedValue({ learningPaths: [] }));
jest.mock('../../hooks/useLearningPathDraft', () => ({
  useLearningPathDraft: () => mockUseLearningPathDraft(),
}));

function baseDraftHookReturn(overrides = {}) {
  return {
    learningPath: null, loading: false, saving: false, publishing: false, error: '',
    dirty: false, isPublished: false, hasUnpublishedChanges: false,
    load: jest.fn(), updateContent: jest.fn(), rebuildTopic: jest.fn(), save: jest.fn().mockResolvedValue(true), publish: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('TeacherCurriculumLearningPathScreen learning path name and save state', () => {
  function generated() {
    mockUseCurriculumUpload.mockReturnValue({
      curriculum: { id: 'c1', file_name: 'Grade_6_Mathematics_Curriculum_Test.docx', status: 'generated' },
      error: '', busy: false, pickAndUpload: jest.fn(), reset: jest.fn(),
    });
  }
  const lp = (extra = {}) => ({
    id: 'lp1', curriculum_id: 'c1', status: 'draft', updated_at: '2026-09-29T10:00:00Z',
    content: { version: 1, metadata: { grade: '6', subject: 'Mathematics' }, units: [] }, ...extra,
  });

  test('the name field suggests "Grade 6 Mathematics" and says a draft is only visible to the teacher', async () => {
    generated();
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({ learningPath: lp() }));
    await render(<TeacherCurriculumLearningPathScreen />);
    await waitFor(() => expect(screen.getByTestId('learning-path-title')).toBeTruthy());
    expect(screen.getByTestId('learning-path-title').props.placeholder).toBe('Grade 6 Mathematics');
    expect(screen.getByTestId('save-state').props.children[0]).toBe('Draft · only you can see this');
  });

  test('typing a name updates the path settings (metadata.title)', async () => {
    generated();
    const updateContent = jest.fn();
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({ learningPath: lp(), updateContent }));
    const { fireEvent } = require('@testing-library/react-native');
    await render(<TeacherCurriculumLearningPathScreen />);
    await fireEvent.changeText(screen.getByTestId('learning-path-title'), 'Term 1 Maths');
    expect(updateContent.mock.calls[0][0].metadata).toEqual({ grade: '6', subject: 'Mathematics', title: 'Term 1 Maths' });
  });

  test('unsaved edits are flagged next to the save state', async () => {
    generated();
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({ learningPath: lp(), dirty: true }));
    await render(<TeacherCurriculumLearningPathScreen />);
    await waitFor(() => expect(screen.getByTestId('save-state')).toBeTruthy());
    expect(screen.getByTestId('save-state').props.children[1]).toBe(' · You have unsaved changes');
  });

  test('a published path stays editable and offers "Publish updates" once it has new edits', async () => {
    generated();
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({ learningPath: lp({ status: 'published' }), isPublished: true, hasUnpublishedChanges: true }));
    await render(<TeacherCurriculumLearningPathScreen />);
    await waitFor(() => expect(screen.getByText('Publish updates')).toBeTruthy());
  });

  test('My Learning Paths lists every path, and Continue editing opens that one', async () => {
    mockUseCurriculumUpload.mockReturnValue({ curriculum: null, error: '', busy: false, pickAndUpload: jest.fn(), reset: jest.fn() });
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn());
    mockListMyLearningPaths.mockResolvedValue({ learningPaths: [
      { id: 'lp9', curriculumId: 'c9', title: 'Grade 6 Mathematics', fileName: 'x.docx', grade: '6', subject: 'Mathematics', status: 'published', updatedAt: '2026-09-29T10:00:00Z', publishedAt: '2026-09-29T09:00:00Z', hasUnpublishedChanges: true },
    ] });
    const user = userEvent.setup();
    await render(<TeacherCurriculumLearningPathScreen />);
    await waitFor(() => expect(screen.getByTestId('my-path-c9')).toBeTruthy());
    expect(screen.getByTestId('my-path-status-c9').props.children).toBe('Published · edits not published yet');
    await user.press(screen.getByTestId('open-path-c9'));
    await waitFor(() => expect(screen.getByText('Open below')).toBeTruthy());
  });
});

describe('TeacherCurriculumLearningPathScreen pre-upload config wiring', () => {
  test('picking a file passes the selected curriculum/grade/subject to pickAndUpload', async () => {
    const pickAndUpload = jest.fn();
    mockUseCurriculumUpload.mockReturnValue({
      curriculum: null, error: '', busy: false, pickAndUpload, reset: jest.fn(),
    });
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn());

    const user = userEvent.setup();
    await render(<TeacherCurriculumLearningPathScreen />);

    await user.press(screen.getByTestId('pre-upload-dropzone'));

    expect(pickAndUpload).toHaveBeenCalledWith(
      expect.objectContaining({ curriculum: expect.any(String), grade: expect.any(String), subject: expect.any(String) })
    );
  });
});

describe('TeacherCurriculumLearningPathScreen publish validation guard', () => {
  function learningPathWithTopics(topics: { status?: 'ready' | 'needs_teacher_input' }[]) {
    return {
      id: 'lp1', curriculum_id: 'c1', status: 'draft' as const,
      content: {
        version: 1,
        units: [{
          title: 'Unit 1', order: 0,
          topics: topics.map((t, i) => ({
            title: `Topic ${i}`, order: i, objectives: [], lessons: [], subtopics: [], ...t,
          })),
        }],
      },
    };
  }

  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockUseCurriculumUpload.mockReturnValue({
      curriculum: { id: 'c1', file_name: 'doc.pdf', status: 'generated' },
      error: '', busy: false, pickAndUpload: jest.fn(), reset: jest.fn(),
    });
  });
  afterEach(() => jest.restoreAllMocks());

  test('Case A: blocks publish and shows an alert when at least one topic needs teacher input', async () => {
    const publish = jest.fn().mockResolvedValue(true);
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({
      learningPath: learningPathWithTopics([{ status: 'ready' }, { status: 'needs_teacher_input' }, { status: 'needs_teacher_input' }]),
      publish,
    }));

    const user = userEvent.setup();
    await render(<TeacherCurriculumLearningPathScreen />);
    await user.press(screen.getByTestId('pre-upload-publish'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Cannot publish yet',
      'Please review and provide input for 2 topics marked "Needs Your Input".'
    );
    expect(publish).not.toHaveBeenCalled();
  });

  test('Case B: proceeds with the normal publish flow when all topics are ready', async () => {
    const publish = jest.fn().mockResolvedValue(true);
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({
      learningPath: learningPathWithTopics([{ status: 'ready' }, { status: 'ready' }]),
      publish,
    }));

    const user = userEvent.setup();
    await render(<TeacherCurriculumLearningPathScreen />);
    await user.press(screen.getByTestId('pre-upload-publish'));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalled();
  });

  test('treats topics with no status field (predating this feature) as valid, not blocking', async () => {
    const publish = jest.fn().mockResolvedValue(true);
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({
      learningPath: learningPathWithTopics([{}, {}]),
      publish,
    }));

    const user = userEvent.setup();
    await render(<TeacherCurriculumLearningPathScreen />);
    await user.press(screen.getByTestId('pre-upload-publish'));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalled();
  });
});
