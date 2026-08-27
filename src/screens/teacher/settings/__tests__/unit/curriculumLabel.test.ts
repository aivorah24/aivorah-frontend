import { curriculumLabel } from '../../utils/curriculumLabel';

describe('curriculumLabel', () => {
  test('a real single curriculum + grade combines into one label', () => {
    expect(curriculumLabel({ curriculum: 'IB PYP', grade: 'Grade 3' })).toBe('IB PYP · Grade 3');
  });

  test('no real curriculum/grade at all falls back to the real IB PYP default', () => {
    expect(curriculumLabel({})).toBe('IB PYP');
  });

  test('real teaches entries with no curriculum/grade fields show the real "not set" hint', () => {
    expect(curriculumLabel({ teaches: [{}] })).toBe('Not set — tap Update to add your grades');
  });

  test('multiple real teaches entries combine into a real multi-grade label', () => {
    expect(curriculumLabel({ teaches: [{ curriculum: 'CBSE', grade: 'Grade 6' }, { curriculum: 'CBSE', grade: 'Grade 7' }] }))
      .toBe('CBSE · Grades 6, 7');
  });

  test('real teaches entries spanning different curricula list both, deduped', () => {
    expect(curriculumLabel({ teaches: [{ curriculum: 'IB MYP', grade: 'Grade 7' }, { curriculum: 'CBSE', grade: 'Grade 7' }] }))
      .toBe('IB MYP, CBSE · Grade 7');
  });
});
