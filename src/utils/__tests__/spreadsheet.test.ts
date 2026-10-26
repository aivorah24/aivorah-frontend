import { parseCsv, xlsxToGrid, guessStudentField, csvEscape, EMAIL_RE } from '../spreadsheet';

describe('parseCsv', () => {
  test('handles quoted commas, escaped quotes, CRLF and blank lines', () => {
    const text = 'Name,Note\r\n"Rao, Asha","said ""hi"""\r\n\r\nBen,\n';
    expect(parseCsv(text)).toEqual([['Name', 'Note'], ['Rao, Asha', 'said "hi"'], ['Ben', '']]);
  });
});

describe('xlsxToGrid', () => {
  test('reads the first sheet and turns numbers into strings', () => {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Student Name', 'Grade'], ['Asha', 4]]), 'S');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    expect(xlsxToGrid(buf)).toEqual([['Student Name', 'Grade'], ['Asha', '4']]);
  });
});

test('guessStudentField maps common header spellings and ignores unknown ones', () => {
  expect(guessStudentField(' Student Name ')).toBe('studentName');
  expect(guessStudentField('BOARD')).toBe('curriculum');
  expect(guessStudentField('Admission #')).toBe('admissionNo');
  expect(guessStudentField('Parent Contact')).toBe('parentPhone');
  expect(guessStudentField('Favourite colour')).toBe('');
});

test('csvEscape quotes only when needed', () => {
  expect(csvEscape('plain')).toBe('plain');
  expect(csvEscape('a,b')).toBe('"a,b"');
  expect(csvEscape('say "x"')).toBe('"say ""x"""');
});

test('EMAIL_RE accepts normal addresses and rejects malformed ones', () => {
  expect(EMAIL_RE.test('a@b.co')).toBe(true);
  expect(EMAIL_RE.test('a@b')).toBe(false);
  expect(EMAIL_RE.test('a b@c.d')).toBe(false);
});

describe('guessStudentField header variants', () => {
  test.each([
    ["Parent's Name", 'parentName'],
    ['Father Name', 'parentName'],
    ['Guardian Email ID', 'parentEmail'],
    ['Mother Mobile No', 'parentPhone'],
    ['Parent Contact', 'parentPhone'],
    ['Student Email', 'studentEmail'],
    ['Email ID', 'studentEmail'],
    ['Class', 'grade'],
    ['Div', 'section'],
    ['Adm No', 'admissionNo'],
    ['Board', 'curriculum'],
    ['Full Name', 'studentName'],
    ['Phone', ''],
  ])('%s -> %s', (header, field) => {
    expect(guessStudentField(header)).toBe(field);
  });
});
