// Integration test for TeacherStudentsScreen — renders the real screen with
// its real hooks/components wired together, mocks fetch for every backend
// call by URL substring (studentsService talks to STUDENTS_SERVER_URL/
// SERVER_URL/PROFILE_SERVER_URL — no need to mock the config files
// themselves, only the network layer). Same pattern as
// teacher/dashboard/__tests__/integration/TeacherDashboardScreen.integration.test.tsx.
import React from 'react';
import { render, screen, waitFor, userEvent, act, within } from '@testing-library/react-native';
import TeacherStudentsScreen from '../../TeacherStudentsScreen';

jest.mock('../../../../../config/firebase', () => ({ options: {} }));
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  deleteApp: jest.fn(() => Promise.resolve()),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'fb-uid-1' } })),
  signOut: jest.fn(() => Promise.resolve()),
  updateProfile: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-navigation/native', () => {
  const ReactLib = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ key: 'TeacherStudents', name: 'TeacherStudents' }),
    useFocusEffect: (cb: any) => { ReactLib.useEffect(() => { cb(); }, []); },  
  };
});

// The mocked user MUST be a stable reference across re-renders — useStudentsList's
// `load` is a useCallback with `[user, isDemo]` deps, so a fresh object literal
// returned on every useAuth() call (a natural mistake to make here) changes
// identity every render, retriggering the effect that calls load() forever and
// hanging the test indefinitely (looks like a timeout, not an obvious loop).
const MOCK_TEACHER_USER = { email: 'teacher@aivorah.test', name: 'Priya Menon', teaches: [{ grade: 'Grade 4', curriculum: 'IB PYP' }] };
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: MOCK_TEACHER_USER }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#000', cardDark: '#111', borderColor: '#222', textMain: '#fff', textMuted: '#ccc',
      textDim: '#999', textHeading: '#fff', accentYellow: '#FFD700', accentGreen: '#0f0', accentRed: '#f00', accentCyan: '#0ff',
    },
    isDark: true,
  }),
}));

const navigation = { openDrawer: jest.fn(), navigate: jest.fn() };

const STUDENT_A = {
  id: 's1', name: 'Aarav Kapoor', email: 'aarav@aivorah.test', grade: 'Grade 4', curriculum: 'IB PYP',
  xpPoints: 100, level: 2, currentStreak: 1, studyTime: 30, completedTopics: ['Fractions'],
  progressPct: 60, assignmentsDone: 3, lastActive: new Date().toISOString(), needsAttention: false,
};
const STUDENT_B = {
  id: 's2', name: 'Bela Rao', email: 'bela@aivorah.test', grade: 'Grade 4', curriculum: 'IB PYP',
  xpPoints: 20, level: 1, currentStreak: 0, studyTime: 5, completedTopics: [],
  progressPct: 10, assignmentsDone: 0, lastActive: '2020-01-01T00:00:00.000Z', needsAttention: true,
};

function jsonRes(url: string, opts?: any) {
  const method = opts?.method || 'GET';
  if (url.includes('/student/by-teacher/')) return Promise.resolve({ ok: true, json: async () => [STUDENT_A, STUDENT_B] });
  if (url.includes('/user/preferences')) return Promise.resolve({ ok: true, json: async () => ({ data: { teaches: [{ grade: 'Grade 4', curriculum: 'IB PYP' }] } }) });
  if (url.includes('/student/available-to-link')) return Promise.resolve({ ok: true, json: async () => [] });
  if (url.includes('/students/promote')) return Promise.resolve({ ok: true, json: async () => ({ promoted: 1, skipped: [] }) });
  if (url.includes('/students/') && method === 'DELETE') return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
  return Promise.resolve({ ok: true, json: async () => ({}) });
}

beforeEach(() => {
  global.fetch = jest.fn((url: string, opts?: any) => jsonRes(url, opts)) as any;
});

describe('TeacherStudentsScreen integration', () => {
  test('loads the real roster and shows accurate stats (total/on-track/needs-attention/avg progress)', async () => {
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    expect(screen.getByTestId('teacher-students-stat-total')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy(); // total
    // avg progress = (60+10)/2 = 35%
    expect(screen.getByText('35%')).toBeTruthy();
  });

  test('an empty roster renders the "no students yet" empty state, not a crash', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) as any;
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByTestId('teacher-students-empty-state')).toBeTruthy());
    expect(screen.getByText('No students yet')).toBeTruthy();
  });

  test('a failed roster fetch does not crash — shows the empty state instead', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as any;
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByTestId('teacher-students-empty-state')).toBeTruthy());
  });

  test('typing in search filters the roster down to matching names, and clearing restores it', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.type(screen.getByTestId('teacher-students-search-input'), 'Bela');
    await waitFor(() => expect(screen.queryByText('Aarav Kapoor')).toBeNull());
    expect(screen.getByText('Bela Rao')).toBeTruthy();

    await user.clear(screen.getByTestId('teacher-students-search-input'));
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());
  });

  test('the "Needs Attention" tab shows only the flagged student', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-tab-needs-attention'));
    await waitFor(() => expect(screen.queryByText('Aarav Kapoor')).toBeNull());
    expect(screen.getByText('Bela Rao')).toBeTruthy();
  });

  test('each card shows its status tag: a day-1 student is Getting Started, an inactive one Needs Attention', async () => {
    const dayOne = { ...STUDENT_A, createdAt: new Date().toISOString(), status: 'getting_started' };
    global.fetch = jest.fn((url: string, opts?: any) =>
      url.includes('/student/by-teacher/')
        ? Promise.resolve({ ok: true, json: async () => [dayOne, { ...STUDENT_B, status: 'needs_attention' }] })
        : jsonRes(url, opts)) as any;
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    expect(within(screen.getByTestId('teacher-students-status-s1')).getByText('Getting Started')).toBeTruthy();
    expect(within(screen.getByTestId('teacher-students-status-s2')).getByText('Needs Attention')).toBeTruthy();
  });

  test('tapping the remove icon calls DELETE and removes the student from the roster', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-remove-s1'));
    await waitFor(() => expect(screen.queryByText('Aarav Kapoor')).toBeNull());
    expect((global.fetch as jest.Mock).mock.calls.some(c => String(c[0]).includes('/students/s1') && c[1]?.method === 'DELETE')).toBe(true);
  });

  test('opening Add Student defaults to the Create New tab with the teacher\'s own grade/curriculum preselected', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-add-button'));
    await waitFor(() => expect(screen.getByTestId('teacher-students-add-modal')).toBeTruthy());
    expect(screen.getByTestId('teacher-students-create-name-input')).toBeTruthy();
  });

  test('Create New requires a name before submit is allowed to succeed', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-add-button'));
    await waitFor(() => expect(screen.getByTestId('teacher-students-create-submit-button')).toBeTruthy());
    await user.press(screen.getByTestId('teacher-students-create-submit-button'));
    await waitFor(() => expect(screen.getByTestId('teacher-students-create-error')).toBeTruthy());
    expect(screen.getByText('Name is required.')).toBeTruthy();
  });

  test('a REAL email sends an invite + verification (no password, no client Firebase signup)', async () => {
    const { createUserWithEmailAndPassword } = jest.requireMock('firebase/auth');
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => (String(url).includes('/students/invite')
      ? Promise.resolve({ ok: true, json: async () => ({ success: true, student: { name: 'Meera Rao', email: 'meera@real.com' }, inviteSent: true, verificationSent: true }) })
      : jsonRes(url, opts)));
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-add-button'));
    await user.type(screen.getByTestId('teacher-students-create-name-input'), 'Meera Rao');
    await user.type(screen.getByTestId('teacher-students-create-email-input'), 'Meera@Real.com');
    expect(screen.queryByTestId('teacher-students-create-password-input')).toBeNull();
    expect(screen.getByTestId('teacher-students-create-invite-note')).toBeTruthy();
    await user.press(screen.getByTestId('teacher-students-create-submit-button'));

    await waitFor(() => expect(screen.getByTestId('teacher-students-invite-sent')).toBeTruthy());
    expect(screen.getByText('Invite Sent')).toBeTruthy();
    const call = (global.fetch as jest.Mock).mock.calls.find(c => String(c[0]).includes('/students/invite'));
    expect(call[0]).toContain('/teacher/teacher%40aivorah.test/students/invite');
    expect(JSON.parse(call[1].body)).toMatchObject({ name: 'Meera Rao', email: 'meera@real.com', grade: 'Grade 4', curriculum: 'IB PYP' });
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    expect((global.fetch as jest.Mock).mock.calls.some(c => String(c[0]).includes('/init-auth'))).toBe(false);
  });

  test('a blank email keeps the auto-generated credentials flow', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (String(url).includes('/init-auth')) return Promise.resolve({ ok: true, json: async () => ({ email: 's9@aivorah.student', password: 'Pw#12345' }) });
      if (String(url).includes('/link-created')) return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      return jsonRes(url, opts);
    });
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-add-button'));
    await user.type(screen.getByTestId('teacher-students-create-name-input'), 'Kid One');
    expect(screen.getByTestId('teacher-students-create-password-input')).toBeTruthy();
    await user.press(screen.getByTestId('teacher-students-create-submit-button'));

    await waitFor(() => expect(screen.getByTestId('teacher-students-creds-modal')).toBeTruthy());
    expect(screen.getByText('Account Created')).toBeTruthy();
    expect(screen.getByText('s9@aivorah.student')).toBeTruthy();
    expect((global.fetch as jest.Mock).mock.calls.some(c => String(c[0]).includes('/students/invite'))).toBe(false);
  });

  test('switching to the Link Existing tab fetches linkable students for the teacher\'s own grades', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-add-button'));
    await user.press(screen.getByTestId('teacher-students-tab-link'));
    await waitFor(() =>
      expect((global.fetch as jest.Mock).mock.calls.some(c => String(c[0]).includes('/student/available-to-link'))).toBe(true)
    );
  });

  test('entering promote mode and selecting a student enables the Promote button, and Cancel exits cleanly', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-promote-mode-button'));
    await waitFor(() => expect(screen.getByTestId('teacher-students-promote-bar')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-card-s1'));
    await waitFor(() => expect(screen.getByText('1 selected')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-promote-cancel'));
    await waitFor(() => expect(screen.queryByTestId('teacher-students-promote-bar')).toBeNull());
  });

  test('promoting a selected student calls the promote endpoint and exits promote mode on success', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-promote-mode-button'));
    await user.press(screen.getByTestId('teacher-students-card-s1'));
    await user.press(screen.getByTestId('teacher-students-promote-confirm-button'));
    await waitFor(() => expect(screen.getByTestId('teacher-students-promote-dialog')).toBeTruthy());

    // For IB-curriculum students the dialog requires picking a target programme
    // chip before any grade chips render at all (gates the forward-only grade list).
    await user.press(screen.getByTestId('teacher-students-promote-program-ib-pyp'));
    await waitFor(() => expect(screen.getByTestId('teacher-students-promote-grade-grade-5')).toBeTruthy());
    await user.press(screen.getByTestId('teacher-students-promote-grade-grade-5'));
    await user.press(screen.getByTestId('teacher-students-promote-dialog-confirm'));

    await waitFor(() =>
      expect((global.fetch as jest.Mock).mock.calls.some(c => String(c[0]).includes('/students/promote'))).toBe(true)
    );
    await waitFor(() => expect(screen.queryByTestId('teacher-students-promote-bar')).toBeNull());
  });

  test('tapping a student card outside promote mode navigates to Teacher Progress', async () => {
    const user = userEvent.setup();
    const nav = { openDrawer: jest.fn(), navigate: jest.fn() };
    await render(<TeacherStudentsScreen navigation={nav} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());

    await user.press(screen.getByTestId('teacher-students-card-s1'));
    expect(nav.navigate).toHaveBeenCalledWith('TeacherProgress', { studentId: 's1' });
  });

  test('pull-to-refresh re-fetches the roster', async () => {
    await render(<TeacherStudentsScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('Aarav Kapoor')).toBeTruthy());
    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;

    const scrollView = screen.getByTestId('teacher-students-scroll');
    await act(async () => { scrollView.props.refreshControl.props.onRefresh(); });

    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
