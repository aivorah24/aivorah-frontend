import { guessTeacherField, reviewTeacherRows } from '../../utils/reviewTeacherRows';

describe('guessTeacherField', () => {
  test.each([
    ['Teacher Name', 'teacherName'],
    ['Email ID', 'email'],
    ['Mobile No', 'phone'],
    ['Classes', 'grade'],
    ['Subjects', 'subjects'],
    ['Department', ''],
  ])('%s -> %s', (header, field) => {
    expect(guessTeacherField(header)).toBe(field);
  });
});

describe('reviewTeacherRows', () => {
  const map = ['teacherName', 'email', 'grade', 'subjects'] as const;

  test('normalises grades and lowercases email', () => {
    const [row] = reviewTeacherRows([['Asha Rao', 'ASHA@S.TEST', 'PYP 5 | 7', 'Maths | Science']], [...map]);
    expect(row.values.email).toBe('asha@s.test');
    expect(row.values.grade).toBe('Grade 5 | Grade 7');
    expect(row.issues).toEqual([]);
  });

  test('blocks a missing name, a bad email and mismatched grade/subject groups', () => {
    const [noName, badEmail, mismatch] = reviewTeacherRows([
      ['', 'a@s.test', '5', 'Maths'],
      ['Ben', 'not-an-email', '5', 'Maths'],
      ['Cy', 'c@s.test', '5 | 6', 'Maths | Science | English'],
    ], [...map]);
    expect(noName.issues).toContain('Teacher Name is missing');
    expect(badEmail.issues).toContain('"not-an-email" is not a valid email');
    expect(mismatch.issues).toContain('2 grade groups but 3 subject groups');
  });

  test('warns on duplicate email, no grade and no email', () => {
    const rows = reviewTeacherRows([
      ['Dev', 'd@s.test', '5', 'Maths'],
      ['Dev', 'd@s.test', '', 'Science'],
      ['Eve', '', '6', 'English'],
    ], [...map]);
    expect(rows[1].warnings).toEqual(['Same email as row 1 — merged into one teacher', 'No grade — can be assigned later']);
    expect(rows[2].warnings).toEqual(['No email — a login will be generated']);
    expect(rows.every((r) => r.issues.length === 0)).toBe(true);
  });
});
