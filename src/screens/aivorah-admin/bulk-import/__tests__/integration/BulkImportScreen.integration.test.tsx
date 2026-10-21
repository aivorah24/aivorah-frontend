import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import BulkImportScreen from '../../BulkImportScreen';

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', accentRed: '#e33', accentCyan: '#5bf', accentGreen: '#3a5', accentBlue: '#5bf', accentOrange: '#f90', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../services/bulkImportService', () => ({ importSpreadsheet: jest.fn(), importTeachers: jest.fn() }));
jest.mock('../../../map-to-teacher/services/mapToTeacherService', () => ({
  fetchAdminSchools: jest.fn(async () => [
    { id: 'sch1', name: 'TSRA', curriculum: 'IB' },
    { id: 'sch2', name: 'Seed Test School (CBSE)', curriculum: 'CBSE' },
    { id: 'sch3', name: 'Blank School', curriculum: null },
  ]),
}));
import { Platform } from 'react-native';
import { importSpreadsheet, importTeachers } from '../../services/bulkImportService';
import { fetchAdminSchools } from '../../../map-to-teacher/services/mapToTeacherService';

const nav = { openDrawer: jest.fn() };

async function choose(user: ReturnType<typeof userEvent.setup>, field: string, option: string) {
  await user.press(screen.getByTestId(field));
  await user.press(await screen.findByTestId(`${field}-option-${option}`));
}

// Stubs the web file input + FileReader so "Choose file" loads `csv`.
function stubFilePicker(csv: string) {
  jest.replaceProperty(Platform, 'OS', 'web');
  const input: any = { click: () => { input.files = [{ name: 'class.csv' }]; input.onchange(); } };
  (global as any).document = { createElement: () => input };
  (global as any).FileReader = class { result = ''; onload: any; readAsText() { this.result = csv; this.onload(); } };
}

describe('BulkImportScreen — spreadsheet tab, school with no curriculum', () => {
  afterEach(() => { delete (global as any).document; delete (global as any).FileReader; jest.restoreAllMocks(); });

  test('curriculum picker gates the import; review line and row warnings use the chosen curriculum', async () => {
    (importSpreadsheet as jest.Mock).mockResolvedValueOnce({ school: 'Blank School', created: 1, skipped: [], errors: [], credentials: [] });
    stubFilePicker('Student Name,Grade,Curriculum\nAsha,7,CBSE');
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await choose(user, 'bulk-sheet-school', 'sch3');
    expect(screen.getByTestId('bulk-sheet-curriculum-hint').props.children).toBe('Blank School has no curriculum yet — choose one');
    await user.press(screen.getByTestId('bulk-sheet-choose'));

    expect(await screen.findByTestId('bulk-sheet-columns-edit')).toBeTruthy();
    expect(screen.getByTestId('bulk-sheet-import').props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByText('Choose a curriculum to import')).toBeTruthy();
    expect(screen.queryByTestId('bulk-sheet-curriculum-note')).toBeNull();

    expect(screen.getByTestId('bulk-sheet-board-value').props.children).toBe('Not set');
    await choose(user, 'bulk-sheet-curriculum', 'IB');
    expect(screen.getByTestId('bulk-sheet-curriculum-hint').props.children).toBe("This will set Blank School's curriculum to IB");
    expect(screen.getByTestId('bulk-sheet-board-value').props.children).toBe('Not set → IB on import');
    expect(screen.getByTestId('bulk-sheet-curriculum-note').props.children).toBe('All students will be enrolled in IB PYP / MYP / DP (by grade) (from Blank School)');
    expect(screen.getByText('! Spreadsheet says CBSE — will use IB MYP')).toBeTruthy();
    expect(screen.getByTestId('bulk-sheet-import').props.accessibilityState?.disabled).toBe(false);

    await user.press(screen.getByTestId('bulk-sheet-import'));
    expect(importSpreadsheet).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 'sch3', curriculum: 'IB', fileName: 'class.csv' }));
  });
});

describe('BulkImportScreen — review table curriculum column', () => {
  afterEach(() => { delete (global as any).document; delete (global as any).FileReader; jest.restoreAllMocks(); });

  async function loadFor(schoolId: string) {
    stubFilePicker('Student Name,Grade\nAsha,3\nBen,7\nCara,12');
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await choose(user, 'bulk-sheet-school', schoolId);
    await user.press(screen.getByTestId('bulk-sheet-choose'));
    await screen.findByTestId('bulk-sheet-row-1');
    return user;
  }
  const curriculumCells = () => [1, 2, 3].map((n) => screen.getByTestId(`bulk-sheet-row-${n}-curriculum`).props.children);

  test('IB school resolves each row by grade: PYP / MYP / DP', async () => {
    await loadFor('sch1');
    expect(screen.getByText('Curriculum')).toBeTruthy();
    expect(curriculumCells()).toEqual(['IB PYP', 'IB MYP', 'IB DP']);
  });

  test('CBSE school shows CBSE on every row', async () => {
    await loadFor('sch2');
    expect(curriculumCells()).toEqual(['CBSE', 'CBSE', 'CBSE']);
  });

  test("school with no curriculum shows '—' until the admin picks one, then the pick per grade", async () => {
    const user = await loadFor('sch3');
    expect(curriculumCells()).toEqual(['—', '—', '—']);
    await choose(user, 'bulk-sheet-curriculum', 'IB');
    expect(curriculumCells()).toEqual(['IB PYP', 'IB MYP', 'IB DP']);
    await choose(user, 'bulk-sheet-curriculum', 'ICSE');
    expect(curriculumCells()).toEqual(['ICSE', 'ICSE', 'ICSE']);
  });

  test('template rows with only a curriculum filled in are dropped, not flagged', async () => {
    stubFilePicker('Student Name,Grade,Curriculum\nAsha,3,IB\n,,IB PYP\n,,\nBen,7,IB');
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await choose(user, 'bulk-sheet-school', 'sch1');
    await user.press(screen.getByTestId('bulk-sheet-choose'));
    await screen.findByTestId('bulk-sheet-row-1');
    expect(screen.getByTestId('bulk-sheet-row-2')).toBeTruthy();
    expect(screen.queryByTestId('bulk-sheet-row-3')).toBeNull();
    expect(screen.queryByText(/need fixing/)).toBeNull();
  });

  test("'Students only' hides the Parent column and sends no parent fields", async () => {
    (importSpreadsheet as jest.Mock).mockResolvedValueOnce({ school: 'TSRA', created: 1, skipped: [], errors: [], credentials: [] });
    stubFilePicker('Student Name,Grade,Parent Name,Parent Email\nAsha,3,Ravi,ravi@x.com');
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await choose(user, 'bulk-sheet-school', 'sch1');
    await user.press(screen.getByTestId('bulk-sheet-choose'));
    await screen.findByTestId('bulk-sheet-row-1');
    expect(screen.getByText('Parent')).toBeTruthy();

    await user.press(screen.getByTestId('bulk-kind-students'));
    expect(screen.queryByText('Parent')).toBeNull();
    await user.press(screen.getByTestId('bulk-sheet-import'));
    const row = (importSpreadsheet as jest.Mock).mock.calls.at(-1)[0].rows[0];
    expect(row).toEqual(expect.objectContaining({ studentName: 'Asha', parentName: '', parentEmail: '' }));
  });

  test('logins title splits students and parents; each row shows its role', async () => {
    (importSpreadsheet as jest.Mock).mockResolvedValueOnce({
      school: 'TSRA', created: 1, skipped: [], errors: [],
      credentials: [
        { name: 'Asha', role: 'student', email: 'asha@x.com', password: 'p1' },
        { name: 'Ravi', role: 'parent', email: 'ravi@x.com', password: 'p2' },
      ],
    });
    const user = await loadFor('sch1');
    await user.press(screen.getByTestId('bulk-sheet-import'));
    expect((await screen.findByTestId('bulk-sheet-logins-title')).props.children).toBe('Logins — 1 student + 1 parent');
    expect(screen.getByTestId('bulk-sheet-cred-ravi@x.com')).toHaveTextContent(/parent/);
  });

  test('BOARD block sits beside the selects with the same label and trigger height', async () => {
    await loadFor('sch1');
    const board = screen.getByTestId('bulk-sheet-board');
    expect(screen.getByText('BOARD')).toBeTruthy();
    expect(screen.getByText('IB PYP / MYP / DP (by grade)')).toBeTruthy();
    expect(board.props.style).toEqual(expect.objectContaining({ minWidth: 140 }));
  });
});

describe('BulkImportScreen — spreadsheet tab', () => {
  test('opens on the spreadsheet tab with the school picker and template download', async () => {
    await render(<BulkImportScreen navigation={nav} />);
    expect(await screen.findByTestId('bulk-sheet-school')).toBeTruthy();
    expect(screen.getByTestId('bulk-sheet-template')).toBeTruthy();
    expect(screen.getByTestId('bulk-sheet-choose')).toBeTruthy();
    expect(screen.queryByTestId('bulk-names')).toBeNull();
  });

  test("when the schools service is unreachable the picker says so instead of 'Loading…' forever", async () => {
    (fetchAdminSchools as jest.Mock).mockRejectedValueOnce(new Error('Failed to load schools'));
    await render(<BulkImportScreen navigation={nav} />);
    expect(await screen.findByText("Couldn't load schools")).toBeTruthy();
    expect(screen.getByText('Failed to load schools Tap to retry.')).toBeTruthy();
  });
});

describe('BulkImportScreen — parent details', () => {
  afterEach(() => { delete (global as any).document; delete (global as any).FileReader; jest.restoreAllMocks(); });

  test("real-world parent headers are matched and the parent's name + email show in review", async () => {
    (importSpreadsheet as jest.Mock).mockResolvedValueOnce({ school: 'TSRA', created: 1, skipped: [], errors: [], credentials: [] });
    stubFilePicker("Student Name,Class,Father's Name,Guardian Email ID,Mother Mobile\nAsha,3,Ravi Rao,Ravi@X.com,9000000001");
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await choose(user, 'bulk-sheet-school', 'sch1');
    await user.press(screen.getByTestId('bulk-sheet-choose'));
    const parent = await screen.findByTestId('bulk-sheet-row-1-parent');
    expect(parent).toHaveTextContent(/Ravi Rao/);
    expect(parent).toHaveTextContent(/ravi@x\.com · 9000000001/);
    expect(screen.getByTestId('bulk-sheet-parent-note')).toHaveTextContent('1 of 1 students will also get a linked parent account');
    await user.press(screen.getByTestId('bulk-sheet-import'));
    expect((importSpreadsheet as jest.Mock).mock.calls.at(-1)[0].rows[0]).toEqual(expect.objectContaining({
      studentName: 'Asha', grade: 'Grade 3', parentName: 'Ravi Rao', parentEmail: 'ravi@x.com', parentPhone: '9000000001',
    }));
  });

  test('a file with no parent column says so instead of silently creating students only', async () => {
    stubFilePicker('Student Name,Grade\nAsha,3');
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await choose(user, 'bulk-sheet-school', 'sch1');
    await user.press(screen.getByTestId('bulk-sheet-choose'));
    await screen.findByTestId('bulk-sheet-row-1');
    expect(screen.getByTestId('bulk-sheet-parent-note')).toHaveTextContent(/No Parent Name column found/);
  });
});

describe('BulkImportScreen — teachers', () => {
  afterEach(() => { delete (global as any).document; delete (global as any).FileReader; jest.restoreAllMocks(); });

  test('imports teachers from a sheet and shows their logins', async () => {
    (importTeachers as jest.Mock).mockResolvedValueOnce({
      school: 'TSRA', created: 2, skipped: [], errors: [],
      credentials: [
        { name: 'Priya Sharma', email: 'priya@real.com', password: 'Pw1', role: 'teacher', grade: 'Grade 3, Grade 4', subjects: ['Maths', 'Science'] },
        { name: 'Rahul Sen', email: 'rahul.sen.x@tsra.teacher', password: 'Pw2', role: 'teacher', grade: 'Grade 7', subjects: ['Physics'] },
      ],
    });
    stubFilePicker('Teacher Name,Email ID,Mobile,Classes,Subjects\nPriya Sharma,Priya@Real.com,98765,3 | 4,Maths | Science\nRahul Sen,,,7,Physics\n,bad,,,');
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await user.press(screen.getByTestId('bulk-kind-teachers'));
    await choose(user, 'bulk-teacher-school', 'sch1');
    await user.press(screen.getByTestId('bulk-teacher-choose'));

    expect(await screen.findByTestId('bulk-teacher-row-1')).toHaveTextContent(/priya@real\.com · 98765/);
    expect(screen.getByTestId('bulk-teacher-row-2')).toHaveTextContent(/login generated/);
    expect(screen.getByTestId('bulk-teacher-row-3')).toHaveTextContent(/Teacher Name is missing/);
    expect(screen.getByTestId('bulk-teacher-ready-count')).toHaveTextContent('2 ready');

    await user.press(screen.getByTestId('bulk-teacher-import'));
    const payload = (importTeachers as jest.Mock).mock.calls[0][0];
    expect(payload.schoolId).toBe('sch1');
    expect(payload.rows).toEqual([
      { teacherName: 'Priya Sharma', email: 'priya@real.com', phone: '98765', grade: 'Grade 3 | Grade 4', subjects: 'Maths | Science' },
      { teacherName: 'Rahul Sen', email: '', phone: '', grade: 'Grade 7', subjects: 'Physics' },
    ]);
    expect(await screen.findByTestId('bulk-teacher-logins-title')).toHaveTextContent('Logins — 2 teachers');
    expect(screen.getByTestId('bulk-teacher-cred-rahul.sen.x@tsra.teacher')).toHaveTextContent(/Grade 7 · Physics/);
  });
});
