import React from 'react';
import { render, screen, waitFor, userEvent, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import SchoolAdminAddParentScreen from '../../SchoolAdminAddParentScreen';
import SCHOOL_ADMIN_SERVER_URL from '../../../../../config/schoolAdminServerUrl';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminAddParent', name: 'SchoolAdminAddParent' }),
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
      bgDark: '#0B0B0B', cardDark: '#141414', cardHover: '#1A1A1A', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentGreen: '#4CAF50', accentRed: '#C98A8A',
    },
  }),
}));

function mockFetchImpl() {
  return (url: string, init?: any) => {
    if (url.includes('/school-admin/grades-sections')) return Promise.resolve({ ok: true, json: async () => ({ grades: [] }) });
    if (url.includes('/school-admin/overview')) return Promise.resolve({ ok: true, json: async () => ({ school: { curriculum: 'CBSE' } }) });
    return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(mockFetchImpl()) as any;
});

describe('SchoolAdminAddParentScreen — integration', () => {
  test('Create Parent is blocked until first and last name are filled', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminAddParentScreen navigation={{}} />);
    await screen.findByPlaceholderText('e.g. Reddy');

    const saveBtn = screen.getByText('Create Parent');
    await user.press(saveBtn);
    expect(screen.getByPlaceholderText('e.g. Reddy')).toBeTruthy();

    await user.type(screen.getByPlaceholderText('e.g. Reddy'), 'Priya');
    await user.type(screen.getByPlaceholderText('e.g. Emandi'), 'Sharma');
    await user.press(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${SCHOOL_ADMIN_SERVER_URL}/school-admin/parents?adminEmail=admin%40school.test`,
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ firstName: 'Priya', lastName: 'Sharma' }) })
      );
    });
  });

  test('successful creation shows login credentials, then Done navigates back', async () => {
    global.fetch = jest.fn((url: string, init?: any) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/school-admin/parents') && method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 'p1', name: 'Priya Sharma', email: 'p1@school.test', password: 'Sup3r#Pass', status: 'invited' }) });
      }
      return mockFetchImpl()(url, init);
    }) as any;
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render(<SchoolAdminAddParentScreen navigation={{ navigate }} />);
    await screen.findByPlaceholderText('e.g. Reddy');

    await user.type(screen.getByPlaceholderText('e.g. Reddy'), 'Priya');
    await user.type(screen.getByPlaceholderText('e.g. Emandi'), 'Sharma');
    await user.press(screen.getByText('Create Parent'));

    expect(await screen.findByText('Parent added')).toBeTruthy();
    expect(screen.getByText('Sup3r#Pass')).toBeTruthy();

    await user.press(screen.getByText('Done'));
    expect(navigate).toHaveBeenCalledWith('SchoolAdminParents');
  });

  test('a rejected child match shows the per-row reason', async () => {
    global.fetch = jest.fn((url: string, init?: any) => {
      const method = init?.method ?? 'GET';
      if (url.includes('/school-admin/parents') && method === 'POST') {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Could not match a child', unresolved: [{ index: 0, reason: 'No student found' }] }) });
      }
      return mockFetchImpl()(url, init);
    }) as any;
    const user = userEvent.setup();
    await render(<SchoolAdminAddParentScreen navigation={{}} />);
    await screen.findByPlaceholderText('e.g. Reddy');

    await user.type(screen.getByPlaceholderText('e.g. Reddy'), 'Priya');
    await user.type(screen.getByPlaceholderText('e.g. Emandi'), 'Sharma');
    await user.type(screen.getByPlaceholderText('e.g. TSRA-1005'), 'TSRA-999');
    await user.press(screen.getByText('Create Parent'));

    expect(await screen.findByText('Could not match a child')).toBeTruthy();
    expect(screen.getByText('No student found')).toBeTruthy();
  });

  test('Add another child adds a second child card', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminAddParentScreen navigation={{}} />);
    await screen.findByText('Child 1');

    await user.press(screen.getByText('Add another child'));
    expect(await screen.findByText('Child 2')).toBeTruthy();
  });

  async function fillNames(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByPlaceholderText('e.g. Reddy');
    await user.type(screen.getByPlaceholderText('e.g. Reddy'), 'Priya');
    await user.type(screen.getByPlaceholderText('e.g. Emandi'), 'Sharma');
  }

  function postResponds(status: number, body: any) {
    global.fetch = jest.fn((url: string, init?: any) => {
      if (url.includes('/school-admin/parents?') && init?.method === 'POST') {
        return Promise.resolve({ ok: status < 300, status, json: async () => body });
      }
      if (url.includes('/children?') && init?.method === 'POST') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'parent-9', name: 'Asha Rao', email: 'asha@x.test', linked: 1 }) });
      }
      return mockFetchImpl()(url, init);
    }) as any;
  }

  test('blank email is omitted from the payload so the server generates a login ID', async () => {
    const user = userEvent.setup();
    await render(<SchoolAdminAddParentScreen navigation={{}} />);
    await fillNames(user);
    await user.type(screen.getByPlaceholderText('e.g. TSRA-1005'), 'TSRA-1044');
    await user.press(screen.getByText('Create Parent'));

    await waitFor(() => {
      const post = (global.fetch as jest.Mock).mock.calls.find(([url, init]) => String(url).includes('/school-admin/parents?') && init?.method === 'POST');
      expect(JSON.parse(post[1].body)).toEqual({ firstName: 'Priya', lastName: 'Sharma', children: [{ admissionNumber: 'TSRA-1044' }] });
    });
  });

  test('a raw EMAIL_EXISTS is never shown — friendly text inline, entered values kept', async () => {
    postResponds(500, { error: 'EMAIL_EXISTS' });
    const user = userEvent.setup();
    await render(<SchoolAdminAddParentScreen navigation={{}} />);
    await fillNames(user);
    await user.press(screen.getByText('Create Parent'));

    const box = await screen.findByTestId('form-submit-error');
    expect(within(box).getByText('This email is already registered.')).toBeTruthy();
    expect(screen.queryByText('EMAIL_EXISTS')).toBeNull();
    expect(screen.getByDisplayValue('Priya')).toBeTruthy();
    expect(screen.getByDisplayValue('Sharma')).toBeTruthy();
  });

  test('typed email of an existing parent → 409 message with a Link action that links the child', async () => {
    postResponds(409, {
      error: 'An account with this email already exists. Link this child to the existing parent instead?',
      code: 'EMAIL_EXISTS',
      existingParent: { id: 'parent-9', name: 'Asha Rao', email: 'asha@x.test' },
    });
    const user = userEvent.setup();
    const navigate = jest.fn();
    await render(<SchoolAdminAddParentScreen navigation={{ navigate }} />);
    await fillNames(user);
    await user.type(screen.getByPlaceholderText('Optional — a login ID is generated if left blank'), 'asha@x.test');
    await user.type(screen.getByPlaceholderText('e.g. TSRA-1005'), 'TSRA-1044');
    await user.press(screen.getByText('Create Parent'));

    expect(await screen.findByText('An account with this email already exists. Link this child to the existing parent instead?')).toBeTruthy();
    expect(screen.getByDisplayValue('asha@x.test')).toBeTruthy();
    await user.press(screen.getByText('Link to Asha Rao'));

    expect(await screen.findByText('Linked to Asha Rao')).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledWith(
      `${SCHOOL_ADMIN_SERVER_URL}/school-admin/parents/parent-9/children?adminEmail=admin%40school.test`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ children: [{ admissionNumber: 'TSRA-1044' }] }) }),
    );
  });

  test('no Link action is offered when no child was entered', async () => {
    postResponds(409, { error: 'An account with this email already exists. Link this child to the existing parent instead?', existingParent: { id: 'parent-9', name: 'Asha Rao', email: 'asha@x.test' } });
    const user = userEvent.setup();
    await render(<SchoolAdminAddParentScreen navigation={{}} />);
    await fillNames(user);
    await user.press(screen.getByText('Create Parent'));
    await screen.findByTestId('form-submit-error');
    expect(screen.queryByText('Link to Asha Rao')).toBeNull();
  });

  test('IB DP grade menu: its row is lifted above the Section row so Grade 11/12 are tappable', async () => {
    global.fetch = jest.fn((url: string, init?: any) => {
      if (url.includes('/school-admin/overview')) return Promise.resolve({ ok: true, json: async () => ({ school: { curriculum: 'IB' } }) });
      return mockFetchImpl()(url, init);
    }) as any;
    const user = userEvent.setup();
    await render(<SchoolAdminAddParentScreen navigation={{}} />);
    await screen.findByText('Child 1');

    await user.press(screen.getByText('Select curriculum'));
    await user.press(await screen.findByText('IB DP'));
    await user.press(screen.getByText('Select grade'));
    await screen.findByText('Grade 12');

    const z = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).zIndex ?? 0;
    expect(z('child-0-row-grade')).toBeGreaterThan(z('child-0-row-section'));

    await user.press(screen.getByText('Grade 12'));
    expect(await screen.findByText('Grade 12')).toBeTruthy();
    expect(screen.queryByText('Grade 11')).toBeNull();
  });
});
