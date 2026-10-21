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

describe('AssignmentCommonFields — languages by curriculum', () => {
  test('IB shows only IB languages', async () => {
    await render(<AssignmentCommonFields {...props({ createMode: 'ai', subject: 'Language Acquisition' })} />);
    for (const l of ['Hindi', 'French', 'Mandarin']) expect(screen.getByText(l)).toBeTruthy();
    for (const l of ['Telugu', 'Sanskrit', 'Russian']) expect(screen.queryByText(l)).toBeNull();
  });

  test('ICSE shows Indian languages, not Mandarin', async () => {
    await render(<AssignmentCommonFields {...props({ createMode: 'ai', subject: 'Language Acquisition', curriculum: 'ICSE', effectiveCurriculum: 'ICSE', teacherCurriculum: 'ICSE' })} />);
    for (const l of ['Telugu', 'Sanskrit', 'French']) expect(screen.getByText(l)).toBeTruthy();
    expect(screen.queryByText('Mandarin')).toBeNull();
  });

  test('a language the board does not offer is cleared in AI mode', async () => {
    const p = props({ createMode: 'ai', subject: 'Language Acquisition', selectedLanguage: 'Telugu' });
    await render(<AssignmentCommonFields {...p} />);
    expect(p.setSelectedLanguage).toHaveBeenCalledWith('');
  });

  test('upload keeps a detected language the board does not list', async () => {
    const p = props({ selectedLanguage: 'Telugu' });
    await render(<AssignmentCommonFields {...p} />);
    expect(screen.getByText('Telugu')).toBeTruthy();
    expect(p.setSelectedLanguage).not.toHaveBeenCalled();
  });
});
