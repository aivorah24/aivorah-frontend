import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TeacherCurriculumLearningPathScreen from '../../TeacherCurriculumLearningPathScreen';

jest.mock('../../../../../components/common/Header', () => {
  const { View, Text } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="header-stub"><Text>{props.title}</Text></View> };
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
jest.mock('../../hooks/useLearningPathDraft', () => ({
  useLearningPathDraft: () => mockUseLearningPathDraft(),
}));

const draftReturn = (learningPath: any = null) => ({ learningPath, load: jest.fn() });
const upload = (curriculum: any, extra = {}) => ({ curriculum, error: '', busy: false, pickAndUpload: jest.fn(), retry: jest.fn(), ...extra });

describe('TeacherCurriculumLearningPathScreen (sidebar: Curriculum Upload)', () => {
  test('is titled Curriculum Upload', async () => {
    mockUseCurriculumUpload.mockReturnValue(upload(null));
    mockUseLearningPathDraft.mockReturnValue(draftReturn());
    await render(<TeacherCurriculumLearningPathScreen navigation={{ navigate: jest.fn() }} />);
    expect(screen.getByText('Curriculum Upload')).toBeTruthy();
  });

  test('picking a file passes the selected curriculum/grade/subject to pickAndUpload', async () => {
    const pickAndUpload = jest.fn();
    mockUseCurriculumUpload.mockReturnValue(upload(null, { pickAndUpload }));
    mockUseLearningPathDraft.mockReturnValue(draftReturn());
    const user = userEvent.setup();
    await render(<TeacherCurriculumLearningPathScreen navigation={{ navigate: jest.fn() }} />);

    await user.press(screen.getByTestId('pre-upload-dropzone'));

    expect(pickAndUpload).toHaveBeenCalledWith(
      expect.objectContaining({ curriculum: expect.any(String), grade: expect.any(String), subject: expect.any(String) })
    );
  });

  test('while processing, the review button waits; there is no save/publish here any more', async () => {
    mockUseCurriculumUpload.mockReturnValue(upload({ id: 'c1', file_name: 'x.pdf', status: 'generating' }));
    mockUseLearningPathDraft.mockReturnValue(draftReturn());
    await render(<TeacherCurriculumLearningPathScreen navigation={{ navigate: jest.fn() }} />);
    expect(screen.getByText('Available when processing finishes')).toBeTruthy();
    expect(screen.queryByTestId('pre-upload-publish')).toBeNull();
    expect(screen.queryByTestId('pre-upload-save-draft')).toBeNull();
  });

  test('once ready it shows what was detected and opens the path in Learning Paths', async () => {
    const navigate = jest.fn();
    mockUseCurriculumUpload.mockReturnValue(upload({ id: 'c1', file_name: 'x.pdf', status: 'generated' }));
    mockUseLearningPathDraft.mockReturnValue(draftReturn({
      id: 'lp1', curriculum_id: 'c1', status: 'draft',
      content: { version: 1, units: [{ title: 'U', order: 0, topics: [{ title: 'A', order: 0, objectives: [], lessons: [], subtopics: [] }, { title: 'B', order: 1, objectives: [], lessons: [], subtopics: [] }] }] },
    }));
    const user = userEvent.setup();
    await render(<TeacherCurriculumLearningPathScreen navigation={{ navigate }} />);

    await waitFor(() => expect(screen.getByText('Your learning path is ready')).toBeTruthy());
    await user.press(screen.getByTestId('pre-upload-open-review'));

    expect(navigate).toHaveBeenCalledWith('TeacherClassLearningPaths', { curriculumId: 'c1' });
  });
});
