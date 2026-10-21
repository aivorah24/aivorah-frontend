// Upload Worksheet: the worksheet language is selectable for ANY subject (it
// drives the students' answer keyboard), with Auto-detect as the default.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AssignmentCommonFields } from '../../components/AssignmentCommonFields';

jest.mock('../../../../../config/serverUrl', () => 'https://server.test');

const props = (over: any = {}) => ({
  showTitleDate: false, showDetails: true, createMode: 'upload' as const, docFilesLength: 1,
  title: '', setTitle: jest.fn(), subject: 'Mathematics', setSubject: jest.fn(),
  selectedLanguage: '', setSelectedLanguage: jest.fn(),
  grade: 'Grade 4', setGrade: jest.fn(), effectiveGrade: 'Grade 4', gradeOptions: ['Grade 4'], isIBPYP: false,
  curriculum: 'IB PYP', setCurriculum: jest.fn(), effectiveCurriculum: 'IB PYP', curriculumOptions: ['IB PYP'], teacherCurriculum: 'IB PYP',
  chapter: '', setChapter: jest.fn(), topicsLoading: false, availableTopics: [],
  dueDate: '', setDueDate: jest.fn(),
  colors: { textDim: '#999', textMain: '#fff', textMuted: '#ccc', accentGreen: '#0f0', borderColor: '#333', cardDark: '#111' } as any,
  gold: '#BAA467', styles: {},
  ...over,
});

describe('AssignmentCommonFields — worksheet language', () => {
  test('upload mode shows Auto-detect + the board\'s languages for any subject, and picking one sets it', async () => {
    const p = props({ curriculum: 'CBSE', effectiveCurriculum: 'CBSE', curriculumOptions: ['CBSE'], teacherCurriculum: 'CBSE' });
    await render(<AssignmentCommonFields {...p} />);
    expect(screen.getByText('Worksheet language')).toBeTruthy();
    expect(screen.getByText('Auto-detect')).toBeTruthy();
    for (const l of ['Telugu', 'Hindi', 'Tamil', 'Malayalam']) expect(screen.getByText(l)).toBeTruthy();
    fireEvent.press(screen.getByTestId('assignment-language-Tamil'));
    expect(p.setSelectedLanguage).toHaveBeenCalledWith('Tamil');
    fireEvent.press(screen.getByTestId('assignment-language-auto'));
    expect(p.setSelectedLanguage).toHaveBeenCalledWith('');
  });

  test('AI mode keeps the picker for Language Acquisition only (no Auto-detect)', async () => {
    await render(<AssignmentCommonFields {...props({ createMode: 'ai' })} />);
    expect(screen.queryByText('Worksheet language')).toBeNull();
    expect(screen.queryByText('Telugu')).toBeNull();
  });
});
