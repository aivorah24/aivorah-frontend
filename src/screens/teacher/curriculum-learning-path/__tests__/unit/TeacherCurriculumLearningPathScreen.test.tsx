import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
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
jest.mock('../../hooks/useLearningPathDraft', () => ({
  useLearningPathDraft: () => mockUseLearningPathDraft(),
}));

function baseDraftHookReturn(overrides = {}) {
  return {
    learningPath: null, loading: false, saving: false, publishing: false, error: '',
    load: jest.fn(), updateContent: jest.fn(), save: jest.fn(), publish: jest.fn(),
    ...overrides,
  };
}

describe('TeacherCurriculumLearningPathScreen metadata display', () => {
  test('shows file name, grade, subject and learning path id once the draft has metadata', async () => {
    mockUseCurriculumUpload.mockReturnValue({
      curriculum: { id: 'c1', file_name: 'Grade_6_Mathematics_Curriculum_Test.docx', status: 'generated' },
      error: '', busy: false, pickAndUpload: jest.fn(), reset: jest.fn(),
    });
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({
      learningPath: {
        id: 'lp1', curriculum_id: 'c1', status: 'draft',
        content: { version: 1, metadata: { grade: '6', subject: 'Mathematics' }, units: [] },
      },
    }));

    await render(<TeacherCurriculumLearningPathScreen />);

    await waitFor(() => expect(screen.getByTestId('curriculum-metadata')).toBeTruthy());
    expect(screen.getByText('File: Grade_6_Mathematics_Curriculum_Test.docx')).toBeTruthy();
    expect(screen.getByText('Grade: 6')).toBeTruthy();
    expect(screen.getByText('Subject: Mathematics')).toBeTruthy();
    expect(screen.getByText('Learning Path ID: lp1')).toBeTruthy();
  });

  test('omits metadata lines that are not present rather than showing blanks', async () => {
    mockUseCurriculumUpload.mockReturnValue({
      curriculum: { id: 'c1', file_name: 'no-metadata.pdf', status: 'generated' },
      error: '', busy: false, pickAndUpload: jest.fn(), reset: jest.fn(),
    });
    mockUseLearningPathDraft.mockReturnValue(baseDraftHookReturn({
      learningPath: { id: 'lp1', curriculum_id: 'c1', status: 'draft', content: { version: 1, units: [] } },
    }));

    await render(<TeacherCurriculumLearningPathScreen />);

    await waitFor(() => expect(screen.getByTestId('curriculum-metadata')).toBeTruthy());
    expect(screen.queryByText(/Grade:/)).toBeNull();
    expect(screen.queryByText(/Subject:/)).toBeNull();
    expect(screen.getByText('Learning Path ID: lp1')).toBeTruthy();
  });
});
