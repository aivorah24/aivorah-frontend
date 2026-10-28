import React from 'react';
import { render } from '@testing-library/react-native';
import { useTeacherCurriculumGrade } from '../../hooks/useTeacherCurriculumGrade';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../../../../onboarding/OnboardingScreen', () => ({ GRADES_TEACHER: ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] }));

beforeEach(() => {
  (global as any).fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
});

async function hookFor(curriculum: string) {
  let out: any;
  function Harness() {
    out = useTeacherCurriculumGrade({ email: 't@x.com', teaches: [{ grade: 'Grade 8', curriculum }] }, 'Mathematics');
    return null;
  }
  await render(<Harness />);
  return out;
}

describe('useTeacherCurriculumGrade — isIBPYP', () => {
  test.each([
    ['IB PYP', true], ['IB_PYP', true], ['ib pyp', true],
    ['IB MYP', false], ['IB DP', false], ['CBSE', false], ['ICSE', false],
  ])("%s → %s", async (curriculum, expected) => {
    expect((await hookFor(curriculum)).isIBPYP).toBe(expected);
  });

  test("exposes the curricula the teacher teaches", async () => {
    expect((await hookFor("IB MYP")).teacherCurricula).toEqual(['IB MYP']);
  });
});
