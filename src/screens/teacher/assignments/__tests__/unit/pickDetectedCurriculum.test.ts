import { pickDetectedCurriculum } from '../../hooks/useUploadWorksheet';

describe('pickDetectedCurriculum', () => {
  test('a PYP worksheet uploaded by an IB MYP teacher keeps the teacher on IB MYP', () => {
    expect(pickDetectedCurriculum('IB PYP', ['IB MYP'])).toBeNull();
  });

  test('picks the matching curriculum when the teacher teaches several', () => {
    expect(pickDetectedCurriculum('IB_PYP', ['IB MYP', 'IB PYP'])).toBe('IB PYP');
  });

  test('NCERT on the sheet maps to a CBSE teacher', () => {
    expect(pickDetectedCurriculum('NCERT', ['CBSE'])).toBe('CBSE');
  });

  test('no known teacher curricula → use what the sheet says', () => {
    expect(pickDetectedCurriculum('IB PYP', [])).toBe('IB PYP');
  });
});
