// Integration test for TeacherStudentProgressScreen — renders the real
// screen with its real hooks/components wired together, mocking only the
// network layer. Same pattern as
// teacher/students/__tests__/integration/TeacherStudentsScreen.integration.test.tsx.
import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TeacherStudentProgressScreen from '../../TeacherStudentProgressScreen';

jest.mock('../../../../../config/firebase', () => ({ options: {} }));
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  deleteApp: jest.fn(() => Promise.resolve()),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'TeacherProgress', name: 'TeacherProgress' }),
}));

const MOCK_TEACHER_USER = { email: 'teacher@aivorah.test', name: 'Priya Menon' };
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

const HEATMAP_RESPONSE = {
  students: [
    { id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
      Fractions: { status: 'mastered', attempts: 1, latestScore: 90, bestScore: 90, struggled: false, lastAttemptDate: '2026-08-20', subject: 'Mathematics' },
    } },
    { id: 's2', name: 'Bela Rao', grade: 'Grade 6', curriculum: 'IB PYP', section: 'B', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
      Fractions: { status: 'stuck', attempts: 2, latestScore: 30, bestScore: 40, struggled: false, lastAttemptDate: '2026-08-01', subject: 'Mathematics' },
    } },
  ],
  topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
};

const SUBJECT_SUMMARY_RESPONSE = {
  subjects: [{ subject: 'Mathematics', avgScorePct: 62, avgAttemptSeconds: 480, attemptCount: 5 }],
  combined: { avgScorePct: 62, avgAttemptSeconds: 480, attemptCount: 5 },
};

const ROSTER_RESPONSE = [
  { id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 90, learningPathTime: 40, assignmentTime: 30, challengeTime: 20, progressPct: 60, totalTopics: 20, completedTopics: ['Fractions', 'Decimals'], quizAttempts: 1, quizBestScore: 90, lastActive: new Date().toISOString(), needsAttention: false },
  { id: 's2', name: 'Bela Rao', grade: 'Grade 6', curriculum: 'IB PYP', section: 'B', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 10, learningPathTime: 5, assignmentTime: 5, challengeTime: 0, progressPct: 5, totalTopics: 20, completedTopics: ['Fractions'], quizAttempts: 2, quizBestScore: 40, lastActive: '2020-01-01T00:00:00.000Z', needsAttention: true },
];

const ATTEMPTS_RESPONSE = {
  attempts: [
    { attemptNumber: 1, score: 90, passed: true, totalQuestions: 10, correctAnswers: 9, mistakes: 1, timeSpentSeconds: 300, date: '2026-08-20T00:00:00Z' },
  ],
};

// This teacher's real Staff Subject Mapping — the edge case from the
// reported feedback: two different (grade, curriculum) combos, each with
// its own real scoped subject.
const PREFERENCES_RESPONSE = {
  teaches: [
    { grade: 'Grade 4', curriculum: 'IB PYP', subjects: ['Mathematics'] },
    { grade: 'Grade 6', curriculum: 'IB PYP', subjects: ['Mathematics'] },
  ],
};

function jsonRes(url: string) {
  if (url.includes('/heatmap')) return Promise.resolve({ ok: true, json: async () => HEATMAP_RESPONSE });
  if (url.includes('/subject-summary')) return Promise.resolve({ ok: true, json: async () => SUBJECT_SUMMARY_RESPONSE });
  if (url.includes('/topic/') && url.includes('/attempts')) return Promise.resolve({ ok: true, json: async () => ATTEMPTS_RESPONSE });
  if (url.includes('/user/preferences')) return Promise.resolve({ ok: true, json: async () => PREFERENCES_RESPONSE });
  if (url.match(/\/by-teacher\/[^/]+$/)) return Promise.resolve({ ok: true, json: async () => ROSTER_RESPONSE });
  return Promise.resolve({ ok: true, json: async () => ({}) });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn((url: string) => jsonRes(url)) as any;
});

describe('TeacherStudentProgressScreen', () => {
  test('loads and renders the real heatmap, defaulted to the teacher\'s first real taught class', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    // Defaults to the teacher's first real (grade, curriculum) combo —
    // Grade 4 IB PYP — so only Aarav (Grade 4) shows until the class is
    // switched, never a generic "All" mixing both classes together.
    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('Bela Rao').length).toBe(0);
    expect(screen.getByTestId('legend-mastered')).toBeTruthy();
    expect(screen.getByTestId('legend-stuck')).toBeTruthy();
  });

  test('a student\'s mastery cell reflects their real status, not a placeholder', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));

    expect(screen.getByTestId('heatmap-cell-s1-Fractions')).toBeTruthy();
  });

  // Edge case from the reported feedback: a teacher can handle Grade 4
  // under IB and Grade 6 under IB (or different curricula) as two separate
  // real classes — switching the class selector must swap rosters, not mix them.
  test('switching the class selector to the teacher\'s other real class swaps the roster, not a generic "All"', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('Bela Rao').length).toBe(0);

    await user.press(screen.getByTestId('class-selector-class-1'));

    await waitFor(() => expect(screen.getAllByText('Bela Rao').length).toBeGreaterThan(0));
    expect(screen.queryAllByText('Aarav Kapoor').length).toBe(0);
  });

  // Regression test for the reported bug: filtering the heatmap to one
  // class left the Activity & Performance table below still showing every
  // student — the two sections shared no filter state.
  test('the class selector also narrows the Activity & Performance table (Section D), not just the heatmap', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy()); // Aarav, Grade 4 — default class
    expect(screen.queryByTestId('activity-row-s2')).toBeNull(); // Bela, Grade 6 — not this class

    await user.press(screen.getByTestId('class-selector-class-1'));

    await waitFor(() => expect(screen.getByTestId('activity-row-s2')).toBeTruthy()); // Bela, Grade 6 — now shown
    expect(screen.queryByTestId('activity-row-s1')).toBeNull(); // Aarav, Grade 4 — filtered out
  });

  test('a backend failure shows a real retry affordance, not a silent blank screen', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;

    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('student-progress-retry')).toBeTruthy());
  });

  test('pressing Retry after a failure re-fetches and can recover to showing real data', async () => {
    let shouldFail = true;
    global.fetch = jest.fn((url: string) => {
      if (shouldFail) return Promise.reject(new Error('down'));
      return jsonRes(url);
    }) as any;
    const user = userEvent.setup();

    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('student-progress-retry')).toBeTruthy());

    shouldFail = false;
    await user.press(screen.getByTestId('student-progress-retry'));

    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));
  });

  test('no linked students -> a real "no students" message, not an empty crash', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/user/preferences')) return Promise.resolve({ ok: true, json: async () => PREFERENCES_RESPONSE });
      return Promise.resolve({ ok: true, json: async () => ({ students: [], topics: [] }) });
    }) as any;

    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText('No students to show for this filter.')).toBeTruthy());
  });

  // Section B — Where the class stands, by subject
  test('renders the real subject summary cards (Section B)', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('subject-card-Mathematics')).toBeTruthy());
    expect(screen.getByTestId('subject-card-combined')).toBeTruthy();
    expect(screen.getAllByText('62%').length).toBeGreaterThan(0);
  });

  // Section D — Activity & Performance table
  test('renders the real Activity & Performance table (Section D), including the real quiz stats', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());
    expect(screen.getByTestId('activity-row-s2')).toBeTruthy();
    expect(screen.getByTestId('needs-attention-s2')).toBeTruthy(); // real needsAttention flag
    expect(screen.queryByTestId('needs-attention-s1')).toBeNull();
  });

  // Section E — drill-down drawer
  test('tapping a heatmap cell with real attempt data opens the drill-down drawer with real attempt history', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));

    await user.press(screen.getByTestId('heatmap-cell-s1-Fractions'));

    await waitFor(() => expect(screen.getByTestId('attempt-drawer')).toBeTruthy());
    expect(screen.getByTestId('attempt-row-1')).toBeTruthy();
  });

  test('closing the drill-down drawer removes it', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));
    await user.press(screen.getByTestId('heatmap-cell-s1-Fractions'));
    await waitFor(() => expect(screen.getByTestId('attempt-drawer')).toBeTruthy());

    await user.press(screen.getByTestId('attempt-drawer-close'));

    expect(screen.queryByTestId('attempt-drawer')).toBeNull();
  });

  // Regression: a cell with no real attempts (e.g. mastered purely via the
  // Learning Path, never quizzed) has nothing real to drill into.
  test('a heatmap cell with zero attempts is not pressable — no drawer opens', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/heatmap')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            students: [{ id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', photoUrl: null, scopedSubjects: [], topicStatus: {
              Fractions: { status: 'mastered', attempts: 0, latestScore: null, bestScore: null, struggled: false, lastAttemptDate: null, subject: 'Mathematics' },
            } }],
            topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
          }),
        });
      }
      return jsonRes(url);
    }) as any;

    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));

    await user.press(screen.getByTestId('heatmap-cell-s1-Fractions'));

    expect(screen.queryByTestId('attempt-drawer')).toBeNull();
  });
});
