import React from 'react';
import { render, screen, waitFor, userEvent, within } from '@testing-library/react-native';
import SchoolAdminAddStudentScreen from '../../SchoolAdminAddStudentScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'SchoolAdminAddStudent', name: 'SchoolAdminAddStudent' }),
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

function mockFetch(postStatus: number, postBody: any) {
  global.fetch = jest.fn((url: string, init?: any) => {
    if (url.includes('/school-admin/students?') && init?.method === 'POST') {
      return Promise.resolve({ ok: postStatus < 300, status: postStatus, json: async () => postBody });
    }
    if (url.includes('/school-admin/grades-sections')) return Promise.resolve({ ok: true, json: async () => ({ grades: [] }) });
    if (url.includes('/school-admin/overview')) return Promise.resolve({ ok: true, json: async () => ({ school: { curriculum: 'CBSE' } }) });
    return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
  }) as any;
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email?: string) {
  await screen.findByPlaceholderText('e.g. Ela');
  await user.type(screen.getByPlaceholderText('e.g. Ela'), 'Sai');
  await user.type(screen.getByPlaceholderText('e.g. Reddy'), 'Kumar');
  await waitFor(() => expect(screen.getByText('Select grade')).toBeTruthy());
  await user.press(screen.getByText('Select grade'));
  await user.press(await screen.findByText('Grade 5'));
  if (email) await user.type(screen.getByPlaceholderText('Optional — generated if left blank'), email);
  await user.press(screen.getByText('Create Student'));
}

beforeEach(() => { jest.clearAllMocks(); });

describe('SchoolAdminAddStudentScreen — errors', () => {
  test('blank email is not sent, so the server generates the login', async () => {
    mockFetch(201, { id: 's1', name: 'Sai Kumar', email: 'sai.kumar.1@tsra.student', password: 'P@ss', admissionNumber: 'TSRA-1045', grade: 'Grade 5', section: null, status: 'invited' });
    const user = userEvent.setup();
    await render(<SchoolAdminAddStudentScreen navigation={{}} />);
    await fillAndSubmit(user);

    await waitFor(() => {
      const post = (global.fetch as jest.Mock).mock.calls.find(([url, init]) => String(url).includes('/school-admin/students?') && init?.method === 'POST');
      expect(JSON.parse(post[1].body)).not.toHaveProperty('email');
    });
  });

  test('typed email already registered → 409 message inline, values kept', async () => {
    mockFetch(409, { error: 'This email is already registered.', code: 'EMAIL_EXISTS' });
    const user = userEvent.setup();
    await render(<SchoolAdminAddStudentScreen navigation={{}} />);
    await fillAndSubmit(user, 'taken@x.test');

    const box = await screen.findByTestId('form-submit-error');
    expect(within(box).getByText('This email is already registered.')).toBeTruthy();
    expect(screen.getByDisplayValue('taken@x.test')).toBeTruthy();
    expect(screen.getByDisplayValue('Sai')).toBeTruthy();
  });

  test('a raw Firebase code from an older backend is mapped, never shown raw', async () => {
    mockFetch(500, { error: 'EMAIL_EXISTS' });
    const user = userEvent.setup();
    await render(<SchoolAdminAddStudentScreen navigation={{}} />);
    await fillAndSubmit(user);

    expect(await screen.findByText('This email is already registered.')).toBeTruthy();
    expect(screen.queryByText('EMAIL_EXISTS')).toBeNull();
  });
});
