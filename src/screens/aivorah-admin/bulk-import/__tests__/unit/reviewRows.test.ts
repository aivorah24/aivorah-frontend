import { reviewRows } from '../../utils/reviewRows';

const MAP = ['studentName', 'studentEmail', 'grade', 'curriculum', 'parentName', 'parentEmail', ''] as any;

test('maps columns, normalises grade/curriculum and ignores unmapped columns', () => {
  const [r] = reviewRows([['Asha Rao', 'ASHA@S.TEST', 'PYP 4', 'IB PYP', 'Mona', 'mona@p.test', 'junk']], MAP, 'IB');
  expect(r.values).toMatchObject({ studentName: 'Asha Rao', studentEmail: 'asha@s.test', grade: 'Grade 4', curriculum: 'IB PYP', parentName: 'Mona', parentEmail: 'mona@p.test' });
  expect(r.issues).toEqual([]);
  expect(r.warnings).toEqual([]);
});

test('blocking issues: missing name, bad emails, duplicate email in the file', () => {
  const rows = reviewRows([
    ['', 'x@s.test', '', '', '', '', ''],
    ['Ben', 'not-an-email', '', '', 'Dad', 'dad@', ''],
    ['Cara', 'x@s.test', '', '', '', '', ''],
  ], MAP, null);
  expect(rows[0].issues).toEqual(['Student Name is missing']);
  expect(rows[1].issues).toEqual(['"not-an-email" is not a valid email', 'Parent email "dad@" is not valid']);
  expect(rows[2].issues).toEqual(['Same email as row 1']);
});

test('warnings: curriculum outside the school board, grade outside the curriculum, orphan parent details, generated login', () => {
  const [a, b, c] = reviewRows([
    ['Dev', 'dev@s.test', '5', 'NCERT', '', '', ''],
    ['Eli', 'eli@s.test', 'Grade 8', 'IB PYP', '', '', ''],
    ['Fay', '', '', '', '', 'p@p.test', ''],
  ], MAP, 'IB');
  expect(a.values.curriculum).toBe('CBSE');
  expect(a.warnings).toEqual(["CBSE isn't one of this school's curricula (IB PYP, IB MYP, IB DP)"]);
  expect(b.warnings).toEqual(['Grade 8 is outside the IB PYP grade range']);
  expect(c.warnings).toEqual(['Parent email/phone is ignored without a Parent Name', 'No email — a login will be generated']);
  [a, b, c].forEach((r) => expect(r.issues).toEqual([]));
});
