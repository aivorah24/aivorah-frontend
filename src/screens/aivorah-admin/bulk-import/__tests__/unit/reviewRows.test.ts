import { reviewRows } from '../../utils/reviewRows';

const MAP = ['studentName', 'studentEmail', 'grade', '', 'parentName', 'parentEmail', ''] as any;
const CURR_COL = 3;

test('maps columns, normalises grade, takes curriculum from the school and never sends it', () => {
  const [r] = reviewRows([['Asha Rao', 'ASHA@S.TEST', 'PYP 4', 'IB PYP', 'Mona', 'mona@p.test', 'junk']], MAP, 'IB', CURR_COL);
  expect(r.values).toMatchObject({ studentName: 'Asha Rao', studentEmail: 'asha@s.test', grade: 'Grade 4', parentName: 'Mona', parentEmail: 'mona@p.test' });
  expect(r.values).not.toHaveProperty('curriculum');
  expect(r.curriculum).toBe('IB PYP');
  expect(r.issues).toEqual([]);
  expect(r.warnings).toEqual([]);
});

test('IB school resolves PYP/MYP/DP by grade; a single-board school uses its board', () => {
  const rows = reviewRows([['A', '', '3', ''], ['B', '', '7', ''], ['C', '', '12', '']], ['studentName', 'studentEmail', 'grade', ''] as any, 'IB');
  expect(rows.map((r) => r.curriculum)).toEqual(['IB PYP', 'IB MYP', 'IB DP']);
  expect(reviewRows([['A', '', '7', '']], ['studentName', 'studentEmail', 'grade', ''] as any, 'CBSE')[0].curriculum).toBe('CBSE');
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

test('warns (without blocking) when the spreadsheet curriculum differs from the school', () => {
  const [a, b, c, d] = reviewRows([
    ['Dev', 'dev@s.test', '3', 'CBSE', '', '', ''],
    ['Eli', 'eli@s.test', 'Grade 8', 'IB PYP', '', '', ''],
    ['Gus', 'gus@s.test', 'Grade 8', 'IB', '', '', ''],
    ['Fay', '', '', '', '', 'p@p.test', ''],
  ], MAP, 'IB', CURR_COL);
  expect(a.warnings).toEqual(['Spreadsheet says CBSE — will use IB PYP']);
  expect(b.warnings).toEqual(['Spreadsheet says IB PYP — will use IB MYP']);
  expect(c.warnings).toEqual([]); // "IB" covers IB MYP
  expect(d.warnings).toEqual(['Parent email/phone is ignored without a Parent Name', 'No email — a login will be generated']);
  [a, b, c, d].forEach((r) => expect(r.issues).toEqual([]));

  const [n] = reviewRows([['Dev', 'dev@s.test', '5', 'NCERT', '', '', '']], MAP, 'CBSE', CURR_COL);
  expect(n.warnings).toEqual([]); // NCERT is CBSE
  const [x] = reviewRows([['Dev', 'dev@s.test', '5', 'ICSE', '', '', '']], MAP, null, CURR_COL);
  expect(x.warnings).toEqual(["Spreadsheet says ICSE — choose the school's curriculum above"]);
});
