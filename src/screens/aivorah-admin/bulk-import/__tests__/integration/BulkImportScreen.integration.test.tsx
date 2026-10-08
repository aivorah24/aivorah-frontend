import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import BulkImportScreen from '../../BulkImportScreen';

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', accentRed: '#e33', accentCyan: '#5bf', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../services/bulkImportService', () => ({ bulkCreateStudents: jest.fn() }));
import { bulkCreateStudents } from '../../services/bulkImportService';

const nav = { openDrawer: jest.fn() };

describe('BulkImportScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('fills the form, submits, and shows the created accounts with their one-time passwords', async () => {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({
      created: [{ name: 'Asha', email: 'asha.123@tsra.student', password: 'Abc123!@', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA' }],
      errors: [],
      total: 1,
    });
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);

    await user.type(screen.getByTestId('bulk-school'), 'TSRA');
    await user.type(screen.getByTestId('bulk-grade'), 'Grade 5');
    await user.type(screen.getByTestId('bulk-curriculum'), 'CBSE');
    await user.type(screen.getByTestId('bulk-names'), 'Asha');
    await user.press(screen.getByTestId('bulk-import-submit'));

    expect(await screen.findByTestId('bulk-created-row-asha.123@tsra.student')).toBeTruthy();
    expect(screen.getByText('Abc123!@')).toBeTruthy();
  });

  test('shows a validation error instead of calling the API when a required field is missing', async () => {
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await user.press(screen.getByTestId('bulk-import-submit'));
    expect(await screen.findByTestId('bulk-import-error')).toBeTruthy();
    expect(bulkCreateStudents).not.toHaveBeenCalled();
  });

  test('shows per-row errors alongside successes', async () => {
    (bulkCreateStudents as jest.Mock).mockResolvedValueOnce({
      created: [],
      errors: [{ name: 'Dup', error: 'Email already exists' }],
      total: 0,
    });
    const user = userEvent.setup();
    await render(<BulkImportScreen navigation={nav} />);
    await user.type(screen.getByTestId('bulk-school'), 'TSRA');
    await user.type(screen.getByTestId('bulk-grade'), 'Grade 5');
    await user.type(screen.getByTestId('bulk-curriculum'), 'CBSE');
    await user.type(screen.getByTestId('bulk-names'), 'Dup');
    await user.press(screen.getByTestId('bulk-import-submit'));
    expect(await screen.findByTestId('bulk-error-row-0')).toBeTruthy();
    expect(screen.getByText('Email already exists')).toBeTruthy();
  });
});
