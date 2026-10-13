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
jest.mock('../../services/bulkImportService', () => ({ bulkCreateStudents: jest.fn(), importSpreadsheet: jest.fn() }));
jest.mock('../../../map-to-teacher/services/mapToTeacherService', () => ({
  fetchAdminSchools: jest.fn(async () => [
    { id: 'sch1', name: 'TSRA', curriculum: 'IB' },
    { id: 'sch2', name: 'Seed Test School (CBSE)', curriculum: 'CBSE' },
    { id: 'sch3', name: 'Blank School', curriculum: null },
  ]),
}));
import { Platform } from 'react-native';
import { bulkCreateStudents, importSpreadsheet } from '../../services/bulkImportService';
import { fetchAdminSchools } from '../../../map-to-teacher/services/mapToTeacherService';

const nav = { openDrawer: jest.fn() };

async function openQuickAdd() {
  const user = userEvent.setup();
  await render(<BulkImportScreen navigation={nav} />);
  await user.press(screen.getByTestId('bulk-tab-quick'));
  return user;
}

async function choose(user: ReturnType<typeof userEvent.setup>, field: string, option: string) {
  await user.press(screen.getByTestId(field));
  await user.press(await screen.findByTestId(`${field}-option-${option}`));
}

describe('BulkImportScreen — Quick add', () => {
  beforeEach(() => jest.clearAllMocks());

  test('curriculum comes from the school (no curriculum field); an IB school offers Grades 1-12; created logins are shown', async () => {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({
      created: [{ name: 'Asha', email: 'asha.123@tsra.student', password: 'Abc123!@', grade: 'Grade 5', curriculum: 'IB PYP', school: 'TSRA' }],
      errors: [], total: 1,
    });
    const user = await openQuickAdd();

    await choose(user, 'bulk-school', 'sch1');
    expect(screen.queryByTestId('bulk-curriculum')).toBeNull();
    expect(screen.getByTestId('bulk-curriculum-note').props.children).toBe('IB PYP / MYP / DP (by grade) (from TSRA)');

    await user.press(screen.getByTestId('bulk-grade'));
    expect(await screen.findByTestId('bulk-grade-option-Grade 12')).toBeTruthy();
    await user.press(screen.getByTestId('bulk-grade-option-Grade 5'));
    await choose(user, 'bulk-section', 'B');

    await user.type(screen.getByTestId('bulk-names'), 'Asha');
    await user.press(screen.getByTestId('bulk-import-submit'));

    const payload = (bulkCreateStudents as jest.Mock).mock.calls[0][0];
    expect(payload).toEqual({ schoolId: 'sch1', school: 'TSRA', grade: 'Grade 5', section: 'B', students: ['Asha'] });
    expect(await screen.findByTestId('bulk-created-row-asha.123@tsra.student')).toBeTruthy();
    expect(screen.getByText('Abc123!@')).toBeTruthy();
  });

  test('a single-board school shows its board as the curriculum', async () => {
    const user = await openQuickAdd();
    await choose(user, 'bulk-school', 'sch2');
    expect(screen.getByTestId('bulk-curriculum-note').props.children).toBe('CBSE (from Seed Test School (CBSE))');
    await user.press(screen.getByTestId('bulk-grade'));
    expect(await screen.findByTestId('bulk-grade-option-Grade 12')).toBeTruthy();
  });

  test('shows a validation error instead of calling the API when a required field is missing', async () => {
    const user = await openQuickAdd();
    await user.press(screen.getByTestId('bulk-import-submit'));
    expect(await screen.findByTestId('bulk-import-error')).toBeTruthy();
    expect(bulkCreateStudents).not.toHaveBeenCalled();
  });

  test('shows per-row errors alongside successes', async () => {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({ created: [], errors: [{ name: 'Dup', error: 'Email already exists' }], total: 0 });
    const user = await openQuickAdd();
    await choose(user, 'bulk-school', 'sch2');
    await choose(user, 'bulk-grade', 'Grade 5');
    await user.type(screen.getByTestId('bulk-names'), 'Dup');
    await user.press(screen.getByTestId('bulk-import-submit'));
    expect(await screen.findByTestId('bulk-error-row-0')).toBeTruthy();
    expect(screen.getByText('Email already exists')).toBeTruthy();
  });
});

jest.mock('../../../../../utils/spreadsheet', () => ({ ...jest.requireActual('../../../../../utils/spreadsheet'), downloadCsv: jest.fn() }));
import { downloadCsv } from '../../../../../utils/spreadsheet';

describe('BulkImportScreen — Quick add, share/download logins', () => {
  const created = [
    { name: 'Asha', email: 'asha.1@x.student', password: 'Pw1!', grade: 'Grade 5', section: 'B' },
    { name: 'Ben', email: 'ben.2@x.student', password: 'Pw2!', grade: 'Grade 5', section: 'B' },
  ];
  let writeText: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'web');
    writeText = jest.fn(async () => {});
    (global as any).navigator = { clipboard: { writeText } }; // no navigator.share
  });
  afterEach(() => { delete (global as any).navigator; jest.restoreAllMocks(); });

  async function createTwo() {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({ created, errors: [], total: 2 });
    const user = await openQuickAdd();
    await choose(user, 'bulk-school', 'sch2');
    await choose(user, 'bulk-grade', 'Grade 5');
    await user.type(screen.getByTestId('bulk-names'), 'Asha\nBen');
    await user.press(screen.getByTestId('bulk-import-submit'));
    await screen.findByTestId('bulk-created-row-asha.1@x.student');
    return user;
  }

  test('per-row share copies that login to the clipboard and shows the note', async () => {
    const user = await createTwo();
    expect(screen.queryByTestId('bulk-share-note')).toBeNull();
    await user.press(screen.getByTestId('bulk-share-asha.1@x.student'));
    expect(writeText).toHaveBeenCalledWith("Asha's Aivorah login:\nEmail: asha.1@x.student\nPassword: Pw1!\nSign in at https://aivorah.ai");
    expect((await screen.findByTestId('bulk-share-note')).props.children).toMatch(/^Login details copied/);
  });

  test('share all copies every login; download writes a CSV named after the school', async () => {
    const user = await createTwo();
    await user.press(screen.getByTestId('bulk-quick-share-all'));
    const text = writeText.mock.calls[0][0];
    expect(text).toContain('Email: asha.1@x.student');
    expect(text).toContain('Email: ben.2@x.student');

    await user.press(screen.getByTestId('bulk-quick-download-logins'));
    expect(downloadCsv).toHaveBeenCalledWith('aivorah-logins-seed-test-school-cbse-.csv', expect.stringContaining('Ben,ben.2@x.student,Pw2!,Grade 5,B'));
  });

  test('uses navigator.share when present instead of copying', async () => {
    const share = jest.fn(async () => {});
    (global as any).navigator.share = share;
    const user = await createTwo();
    await user.press(screen.getByTestId('bulk-share-ben.2@x.student'));
    expect(share).toHaveBeenCalledWith({ text: expect.stringContaining('Password: Pw2!') });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByTestId('bulk-share-note')).toBeNull();
  });

  test('download is web-only', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await createTwo();
    expect(screen.queryByTestId('bulk-quick-download-logins')).toBeNull();
    expect(screen.getByTestId('bulk-quick-share-all')).toBeTruthy();
  });
});

describe('BulkImportScreen — Quick add, school with no curriculum', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requires a curriculum pick (button disabled), shows the hint, and sends it', async () => {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({ created: [], errors: [], total: 0 });
    const user = await openQuickAdd();
    await choose(user, 'bulk-school', 'sch3');
    expect(screen.queryByTestId('bulk-curriculum-note')).toBeNull();
    expect(screen.getByTestId('bulk-curriculum-hint').props.children).toBe('Blank School has no curriculum yet — choose one');
    await user.type(screen.getByTestId('bulk-names'), 'Asha');
    await user.press(screen.getByTestId('bulk-import-submit'));
    expect(bulkCreateStudents).not.toHaveBeenCalled();

    await choose(user, 'bulk-curriculum', 'IB');
    expect(screen.getByTestId('bulk-curriculum-hint').props.children).toBe("This will set Blank School's curriculum to IB");
    await choose(user, 'bulk-grade', 'Grade 7');
    await user.press(screen.getByTestId('bulk-import-submit'));
    expect(bulkCreateStudents).toHaveBeenCalledWith({ schoolId: 'sch3', school: 'Blank School', curriculum: 'IB', grade: 'Grade 7', section: '', students: ['Asha'] });
  });

  test('a school that already has a curriculum shows no picker and sends none', async () => {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({ created: [], errors: [], total: 0 });
    const user = await openQuickAdd();
    await choose(user, 'bulk-school', 'sch2');
    expect(screen.queryByTestId('bulk-curriculum')).toBeNull();
    await choose(user, 'bulk-grade', 'Grade 5');
    await user.type(screen.getByTestId('bulk-names'), 'Bo');
    await user.press(screen.getByTestId('bulk-import-submit'));
    expect((bulkCreateStudents as jest.Mock).mock.calls[0][0]).not.toHaveProperty('curriculum');
  });
});

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
