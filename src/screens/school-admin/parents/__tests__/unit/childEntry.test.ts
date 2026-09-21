import { newChildEntry, getGradesForCurriculum, curriculaForBase, childrenToPayload } from '../../utils/childEntry';

describe('newChildEntry', () => {
  test('starts with blank fields and a unique key', () => {
    const a = newChildEntry();
    const b = newChildEntry();
    expect(a).toMatchObject({ admissionNumber: '', name: '', curriculum: '', grade: '', section: '' });
    expect(a.key).not.toBe(b.key);
  });
});

describe('curriculaForBase', () => {
  test('IB expands to all three IB programmes', () => { expect(curriculaForBase('IB')).toEqual(['IB PYP', 'IB MYP', 'IB DP']); });
  test('a known non-IB base narrows to itself', () => { expect(curriculaForBase('CBSE')).toEqual(['CBSE']); });
  test('null base offers every curriculum', () => { expect(curriculaForBase(null)).toEqual(['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge']); });
});

describe('getGradesForCurriculum', () => {
  test('IB PYP is grades 1-5', () => { expect(getGradesForCurriculum('IB PYP')).toEqual(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']); });
  test('unrecognized curriculum falls back to the full range', () => {
    expect(getGradesForCurriculum('')).toContain('Nursery');
    expect(getGradesForCurriculum('')).toContain('Grade 12');
  });
});

describe('childrenToPayload', () => {
  test('drops entries with no admission number and no name', () => {
    const children = [
      { key: '1', admissionNumber: '', name: '', curriculum: '', grade: '', section: '' },
      { key: '2', admissionNumber: 'TSRA-1', name: '', curriculum: '', grade: 'Grade 3', section: 'A' },
    ];
    expect(childrenToPayload(children)).toEqual([{ admissionNumber: 'TSRA-1', name: undefined, grade: 'Grade 3', section: 'A' }]);
  });

  test('trims whitespace and omits blank optional fields as undefined', () => {
    const children = [{ key: '1', admissionNumber: '  ', name: ' Vihaan Kapoor ', curriculum: '', grade: '', section: '' }];
    expect(childrenToPayload(children)).toEqual([{ admissionNumber: undefined, name: 'Vihaan Kapoor', grade: undefined, section: undefined }]);
  });
});
