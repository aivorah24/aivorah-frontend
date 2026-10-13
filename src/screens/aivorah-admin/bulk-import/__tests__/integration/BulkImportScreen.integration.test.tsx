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
  ]),
}));
import { bulkCreateStudents } from '../../services/bulkImportService';
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
    expect(screen.getByTestId('bulk-curriculum-note').props.children).toBe('Curriculum: IB PYP / MYP / DP (by grade) (from TSRA)');

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
    expect(screen.getByTestId('bulk-curriculum-note').props.children).toBe('Curriculum: CBSE (from Seed Test School (CBSE))');
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
