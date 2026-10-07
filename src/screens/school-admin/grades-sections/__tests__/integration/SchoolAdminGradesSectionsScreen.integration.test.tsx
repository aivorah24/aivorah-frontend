import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import SchoolAdminGradesSectionsScreen from '../../SchoolAdminGradesSectionsScreen';
import SERVER_URL from '../../../../../config/schoolAdminServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminGradesSections', name: 'SchoolAdminGradesSections' }),
  useFocusEffect: (cb: any) => {
    require('react').useEffect(() => { cb(); }, []);
  },
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Admin User', email: 'admin@school.test', role: 'school_admin' } }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentRed: '#C98A8A',
    },
  }),
}));

const SAMPLE_GRADES = [
  {
    name: 'Grade 6', archived: false, unassignedCount: 1, totalStudents: 5,
    sections: [
      { name: 'A', archived: false, studentCount: 3 },
      { name: 'B', archived: false, studentCount: 1 },
    ],
  },
  {
    name: 'Grade 7', archived: true, unassignedCount: 0, totalStudents: 2,
    sections: [{ name: 'A', archived: false, studentCount: 2 }],
  },
];

function mockFetchImpl(grades = SAMPLE_GRADES) {
  return (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/school-admin/grades-sections') && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => ({ grades }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ ok: true, grades }) });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('SchoolAdminGradesSectionsScreen — integration', () => {
  test('resolves from loading to showing data', async () => {
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    expect(await screen.findByText('Grade 6')).toBeTruthy();
  });

  test('renders grade/section rows with names, counts, and archived state', async () => {
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);

    expect(await screen.findByText('Grades & Sections')).toBeTruthy();
    expect(screen.getByText('Grade 6')).toBeTruthy();
    expect(screen.getByText('5 students')).toBeTruthy();
    expect(screen.getByText('Section A')).toBeTruthy();
    expect(screen.getByText('· 3 students')).toBeTruthy();
    expect(screen.getByText('No section')).toBeTruthy();
    expect(screen.getByText('· 1')).toBeTruthy();

    // Archived grade hidden by default
    expect(screen.queryByText('Grade 7')).toBeNull();

    expect(global.fetch).toHaveBeenCalledWith(
      `${SERVER_URL}/school-admin/grades-sections?adminEmail=admin%40school.test`
    );
  });

  test('shows the empty state when there are no grades', async () => {
    global.fetch = jest.fn(mockFetchImpl([])) as any;
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    expect(await screen.findByText("No grades yet. Add your first grade to define your school's structure.")).toBeTruthy();
  });

  test('shows an error state with Retry, which reloads on press', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/school-admin/grades-sections')) {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Failed to load grades & sections' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as any;
    const user = userEvent.setup();

    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    expect(await screen.findByText('Failed to load grades & sections')).toBeTruthy();

    global.fetch = jest.fn(mockFetchImpl()) as any;
    await user.press(screen.getByText('Retry'));
    expect(await screen.findByText('Grade 6')).toBeTruthy();
  });

  test('toggles Show archived / Hide archived', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    await screen.findByText('Grade 6');

    await user.press(screen.getByText('Show archived (1)'));
    expect(await screen.findByText('Grade 7')).toBeTruthy();
    expect(screen.getByText('Archived')).toBeTruthy();

    await user.press(screen.getByText('Hide archived'));
    expect(screen.queryByText('Grade 7')).toBeNull();
  });

  test('Add Grade: opens modal, validates, submits, and refreshes the list', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    await screen.findByText('Grade 6');

    await user.press(screen.getByText('Add Grade'));
    const input = await screen.findByPlaceholderText('e.g. Grade 7');

    const addButtons = screen.getAllByText('Add');
    await user.press(addButtons[addButtons.length - 1]);
    expect(await screen.findByText('Please enter a name.')).toBeTruthy();

    await user.type(input, 'Grade 8');
    await user.press(screen.getAllByText('Add')[screen.getAllByText('Add').length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${SERVER_URL}/school-admin/grades?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Grade 8' }) })
      );
    });
    expect(screen.queryByPlaceholderText('e.g. Grade 7')).toBeNull();
  });

  test('Add Section: opens modal scoped to the right grade and submits', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    await screen.findByText('Grade 6');

    await user.press(screen.getByText('Add section'));
    expect(await screen.findByText('Add Section to Grade 6')).toBeTruthy();

    await user.type(screen.getByPlaceholderText('e.g. B'), 'C');
    const addButtons = screen.getAllByText('Add');
    await user.press(addButtons[addButtons.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${SERVER_URL}/school-admin/grades/Grade%206/sections?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'C' }) })
      );
    });
    // Right after adding, the "assign a class teacher now" prompt opens —
    // Attendance and other class-teacher-gated features have nothing to
    // show until this is done, so it's offered immediately rather than
    // left as an easy-to-forget separate trip to the Classes screen.
    expect(await screen.findByText('Assign Class Teacher')).toBeTruthy();
    expect(screen.getByText('Grade 6 · Section C')).toBeTruthy();
  });

  test('Rename: pre-fills current name, shows cascade hint, and submits a PATCH', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    await screen.findByText('Grade 6');

    await user.press(screen.getByText('Rename'));
    expect(await screen.findByText('Rename Grade 6')).toBeTruthy();
    expect(screen.getByDisplayValue('Grade 6')).toBeTruthy();
    expect(screen.getByText('Every student currently in this grade will be updated to the new name.')).toBeTruthy();

    const input = screen.getByDisplayValue('Grade 6');
    await user.clear(input);
    await user.type(input, 'Grade Six');
    // The table row's own "Rename" action link is still in the tree behind
    // the modal overlay, so scope to the last (modal) match.
    const renameButtons = screen.getAllByText('Rename', { exact: true });
    await user.press(renameButtons[renameButtons.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${SERVER_URL}/school-admin/grades/Grade%206?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Grade Six' }) })
      );
    });
  });

  test('server error on mutation shows the message inside the modal and keeps it open', async () => {
    global.fetch = jest.fn((url: string, init?: any) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/school-admin/grades-sections') && method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ grades: SAMPLE_GRADES }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'Grade already exists.' }) });
    }) as any;
    const user = userEvent.setup();

    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    await screen.findByText('Grade 6');

    await user.press(screen.getByText('Add Grade'));
    await user.type(screen.getByPlaceholderText('e.g. Grade 7'), 'Grade 6');
    const addButtons = screen.getAllByText('Add');
    await user.press(addButtons[addButtons.length - 1]);

    expect(await screen.findByText('Grade already exists.')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. Grade 7')).toBeTruthy();
  });

  test('Archive / Restore call the archive API with the correct flag', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminGradesSectionsScreen navigation={{}} />);
    await screen.findByText('Grade 6');

    await user.press(screen.getByText('Archive'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${SERVER_URL}/school-admin/grades/Grade%206/archive?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ archived: true }) })
      );
    });

    await user.press(screen.getByText('Show archived (1)'));
    await screen.findByText('Grade 7');
    await user.press(screen.getByText('Restore'));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${SERVER_URL}/school-admin/grades/Grade%207/archive?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ archived: false }) })
      );
    });
  });
});
