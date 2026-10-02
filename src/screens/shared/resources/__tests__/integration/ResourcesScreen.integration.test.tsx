import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import ResourcesScreen from '../../ResourcesScreen';
import TIMETABLE_RESOURCES_SERVER_URL from '../../../../../config/timetableResourcesServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Resources', name: 'Resources' }),
  // Depend on the callback's own identity, not a fixed [] (unlike the
  // Classes/Grades-Sections integration tests) — Resources relies on
  // useFocusEffect re-running load(folderId) whenever folderId changes
  // (drilling into a folder), not just on mount. The real screen's
  // `useCallback(() => load(folderId), [load, folderId])` gives `cb` a new
  // identity exactly when folderId changes, so depending on [cb] mirrors
  // real re-focus behavior without re-running on every unrelated render.
  useFocusEffect: (cb: any) => {
    require('react').useEffect(cb, [cb]);
  },
}));

jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'tok-1' }, authStateReady: async () => {} },
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Priya Menon', email: 'teacher@school.test', role: 'teacher' } }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', cardHover: '#1A1A1A', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentRed: '#C98A8A',
    },
  }),
}));

const FOLDER = { id: 'f1', name: 'Handbooks', scope: 'school', author: 'Admin', updatedAt: '2026-01-01T00:00:00Z' };
const FILE = { id: 'file1', title: 'Attendance Policy.pdf', fileUrl: 'https://x/doc.pdf', fileType: 'pdf', fileSize: 1024, scope: 'school', author: 'Admin', updatedAt: '2026-01-02T00:00:00Z' };

function mockFetchImpl({ canManage = true, folders = [FOLDER], files = [FILE], breadcrumb = [] as any[] } = {}) {
  return (url: string, init?: any) => {
    const method = init?.method ?? 'GET';
    if (url.includes('/resources') && method === 'GET') {
      return Promise.resolve({ ok: true, json: async () => ({ canManage, scopeLabel: null, breadcrumb, folders, files }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('ResourcesScreen — integration', () => {
  describe('canManage: true', () => {
    test('resolves from loading to showing folders and files', async () => {
      await render(<ResourcesScreen navigation={{}} />);
      expect(await screen.findByText('Handbooks')).toBeTruthy();
      expect(screen.getByText('Attendance Policy.pdf')).toBeTruthy();
      expect(screen.getByText('Name', { exact: true })).toBeTruthy();

      expect(global.fetch).toHaveBeenCalledWith(`${TIMETABLE_RESOURCES_SERVER_URL}/resources`, expect.objectContaining({ headers: { Authorization: 'Bearer tok-1' } }));
    });

    test('shows New folder and Upload management actions', async () => {
      await render(<ResourcesScreen navigation={{}} />);
      await screen.findByText('Handbooks');
      expect(screen.getByText('New folder')).toBeTruthy();
      expect(screen.getByText('Upload')).toBeTruthy();
    });

    test('New folder: opens modal, validates empty name, submits, and refreshes', async () => {
      const user = userEvent.setup();
      await render(<ResourcesScreen navigation={{}} />);
      await screen.findByText('Handbooks');

      await user.press(screen.getByText('New folder'));
      await waitFor(() => expect(screen.getAllByText('New folder', { exact: true }).length).toBe(2));

      const createBtn = screen.getByText('Create');
      await user.press(createBtn);
      // Blank name is a silent no-op (submitNewFolder returns early) — modal stays open.
      expect(screen.getByPlaceholderText('Folder name')).toBeTruthy();

      await user.type(screen.getByPlaceholderText('Folder name'), 'Policies');
      await user.press(screen.getByText('Create'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `${TIMETABLE_RESOURCES_SERVER_URL}/resources/folder`,
          expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Policies', parentFolderId: null, scope: 'school' }) })
        );
      });
      expect(screen.queryByPlaceholderText('Folder name')).toBeNull();
    });

    test('opening a folder triggers a reload scoped to that folderId', async () => {
      const user = userEvent.setup();
      await render(<ResourcesScreen navigation={{}} />);
      await screen.findByText('Handbooks');

      await user.press(screen.getByText('Handbooks'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('folderId=f1'), expect.anything());
      });
    });

    test('server error on New folder shows the message inside the modal and keeps it open', async () => {
      global.fetch = jest.fn((url: string, init?: any) => {
        const method = init?.method ?? 'GET';
        if (url.includes('/resources') && method === 'GET') {
          return Promise.resolve({ ok: true, json: async () => ({ canManage: true, scopeLabel: null, breadcrumb: [], folders: [FOLDER], files: [FILE] }) });
        }
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Folder already exists' }) });
      }) as any;
      const user = userEvent.setup();

      await render(<ResourcesScreen navigation={{}} />);
      await screen.findByText('Handbooks');

      await user.press(screen.getByText('New folder'));
      await user.type(screen.getByPlaceholderText('Folder name'), 'Handbooks');
      await user.press(screen.getByText('Create'));

      expect(await screen.findByText('Folder already exists')).toBeTruthy();
      expect(screen.getByPlaceholderText('Folder name')).toBeTruthy();
    });
  });

  describe('canManage: false', () => {
    test('hides New folder and Upload management actions', async () => {
      global.fetch = jest.fn(mockFetchImpl({ canManage: false })) as any;
      await render(<ResourcesScreen navigation={{}} />);
      await screen.findByText('Handbooks');
      expect(screen.queryByText('New folder')).toBeNull();
      expect(screen.queryByText('Upload')).toBeNull();
    });

    test('still renders the read-only folder/file list', async () => {
      global.fetch = jest.fn(mockFetchImpl({ canManage: false })) as any;
      await render(<ResourcesScreen navigation={{}} />);
      expect(await screen.findByText('Handbooks')).toBeTruthy();
      expect(screen.getByText('Attendance Policy.pdf')).toBeTruthy();
    });
  });

  test('shows the empty state when there are no folders or files', async () => {
    global.fetch = jest.fn(mockFetchImpl({ folders: [], files: [] })) as any;
    await render(<ResourcesScreen navigation={{}} />);
    expect(await screen.findByText('No resources here yet.')).toBeTruthy();
  });

  test('search narrows results to a "nothing matches" empty state', async () => {
    const user = userEvent.setup();
    await render(<ResourcesScreen navigation={{}} />);
    await screen.findByText('Handbooks');

    await user.type(screen.getByPlaceholderText('Search for a folder or file'), 'zzz-no-match');

    expect(await screen.findByText('Nothing matches "zzz-no-match"')).toBeTruthy();
  });

  test('a load failure shows the error message', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Failed to load resources' }) }) as any;
    await render(<ResourcesScreen navigation={{}} />);
    expect(await screen.findByText('Failed to load resources')).toBeTruthy();
  });
});
