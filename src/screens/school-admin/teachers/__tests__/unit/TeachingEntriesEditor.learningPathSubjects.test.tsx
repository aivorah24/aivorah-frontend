import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import TeachingEntriesEditor from '../../components/TeachingEntriesEditor';
import LegacyEditor from '@legacy/school-admin/TeachingEntriesEditor';
import { clearLearningPathSubjectsCache } from '../../../../../hooks/useLearningPathSubjects';

const colors: any = new Proxy({}, { get: () => '#000' });
const realFetch = global.fetch;

function mockSubjects(subjects: string[] | null) {
  global.fetch = jest.fn().mockResolvedValue(
    subjects ? { ok: true, json: () => Promise.resolve({ subjects: subjects.map(subject => ({ subject })) }) } : { ok: false },
  ) as any;
}

beforeEach(() => clearLearningPathSubjectsCache());
afterEach(() => { global.fetch = realFetch; });

describe.each([
  ['school-admin editor', TeachingEntriesEditor],
  ['teacher settings / onboarding editor', LegacyEditor],
])('%s: subjects follow the Learning Path', (_name, Editor: any) => {
  const renderEditor = (subjectsInput = '', onChange = jest.fn()) => render(
    <Editor
      entries={[{ curriculum: 'CBSE', grade: 'Grade 9', subjectsInput }]} onChange={onChange}
      schoolCurriculumBase={null} colors={colors} openDropdown={null} setOpenDropdown={() => {}}
    />,
  );

  test('shows exactly the Learning Path subjects for CBSE Grade 9', async () => {
    mockSubjects(['English', 'Hindi', 'Mathematics', 'Science', 'Physical Education and Well Being']);
    await renderEditor();
    expect(await screen.findByText('Physical Education and Well Being')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/curriculum/subjects?grade=Grade%209&curriculum=CBSE'));
    expect(screen.queryByText('ICT')).toBeNull();
    expect(screen.queryByText('Social Science')).toBeNull();
  });

  test('keeps an already-saved subject visible (ticked) so it can be removed', async () => {
    mockSubjects(['English', 'Hindi']);
    const onChange = jest.fn();
    await renderEditor('ICT', onChange);
    fireEvent.press(await screen.findByText('ICT'));
    expect(onChange).toHaveBeenCalledWith([{ curriculum: 'CBSE', grade: 'Grade 9', subjectsInput: '' }]);
  });

  test('falls back to the built-in list when the Learning Path has nothing', async () => {
    mockSubjects(null);
    await renderEditor();
    await waitFor(() => expect(screen.getByText('Social Science')).toBeTruthy());
  });
});
