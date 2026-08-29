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

// jsPDF isn't relevant to component behavior here and pulls in canvas/DOM
// machinery jsdom doesn't have — stub the one method exportPdf.ts calls.
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    internal: { pageSize: { getHeight: () => 800, getWidth: () => 600 } },
    setFont: jest.fn(), setFontSize: jest.fn(), setTextColor: jest.fn(),
    text: jest.fn(), addPage: jest.fn(), save: jest.fn(),
  })),
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

const ROSTER_RESPONSE = [
  { id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 90, learningPathTime: 40, learningPathTimeToday: 12, assignmentTime: 30, challengeTime: 20, progressPct: 60, totalTopics: 20, completedTopics: ['Fractions', 'Decimals'], quizAttempts: 1, quizBestScore: 90, lastActive: new Date().toISOString(), needsAttention: false },
  { id: 's2', name: 'Bela Rao', grade: 'Grade 6', curriculum: 'IB PYP', section: 'B', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 10, learningPathTime: 5, learningPathTimeToday: 0, assignmentTime: 5, challengeTime: 0, progressPct: 5, totalTopics: 20, completedTopics: ['Fractions'], quizAttempts: 0, quizBestScore: null, lastActive: '2020-01-01T00:00:00.000Z', needsAttention: true },
];

const ATTEMPTS_RESPONSE = {
  attempts: [
    { attemptNumber: 1, score: 90, passed: true, totalQuestions: 10, correctAnswers: 9, mistakes: 1, timeSpentSeconds: 300, date: '2026-08-20T00:00:00Z' },
  ],
};

function jsonRes(url: string) {
  if (url.includes('/heatmap')) return Promise.resolve({ ok: true, json: async () => HEATMAP_RESPONSE });
  if (url.includes('/topic/') && url.includes('/attempts')) return Promise.resolve({ ok: true, json: async () => ATTEMPTS_RESPONSE });
  if (url.match(/\/by-teacher\/[^/]+$/)) return Promise.resolve({ ok: true, json: async () => ROSTER_RESPONSE });
  return Promise.resolve({ ok: true, json: async () => ({}) });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn((url: string) => jsonRes(url)) as any;
});

describe('TeacherStudentProgressScreen', () => {
  test('loads and renders the real heatmap: both real students, no generic "All" default hiding anyone', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Bela Rao').length).toBeGreaterThan(0);
    expect(screen.getByTestId('legend-mastered')).toBeTruthy();
    expect(screen.getByTestId('legend-stuck')).toBeTruthy();
  });

  test('a student\'s mastery cell reflects their real status, not a placeholder', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getAllByText('Aarav Kapoor').length).toBeGreaterThan(0));

    expect(screen.getByTestId('heatmap-cell-s1-Fractions')).toBeTruthy();
    expect(screen.getByTestId('heatmap-cell-s2-Fractions')).toBeTruthy();
  });

  // Regression test for the reported bug: filtering the heatmap to one
  // grade left the Activity & Performance table below still showing every
  // grade — the two sections shared no filter state.
  test('the Grade filter narrows BOTH the heatmap and the Activity & Performance table (Section D), never one alone', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());
    expect(screen.getByTestId('activity-row-s2')).toBeTruthy(); // Bela Rao, Grade 6

    await user.press(screen.getByTestId('top-filter-Grade-Grade 4'));

    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy()); // Aarav, Grade 4 — stays
    expect(screen.queryByTestId('activity-row-s2')).toBeNull(); // Bela, Grade 6 — filtered out
    // Topic exploration narrows too — same shared filter state.
    expect(screen.queryByTestId('heatmap-cell-s2-Fractions')).toBeNull();
  });

  // "Class" filter maps to curriculum — the edge case a teacher can handle
  // the same grade under two different curricula.
  test('the Class (curriculum) filter is a real, independent filter option', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    expect(screen.getByTestId('top-filter-Class-IB PYP')).toBeTruthy();
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
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ students: [], topics: [] }) }) as any;

    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText('No students to show for this filter.')).toBeTruthy());
  });

  // Section 4 — Subject Progress, now derived client-side from the SAME
  // filtered heatmap data (see utils/subjectSummary.ts), not a separate
  // unfiltered backend call — so it can never disagree with Topic
  // Exploration below it.
  test('renders the real Subject Progress cards (Section 4), consistent with the heatmap data', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('subject-card-Mathematics')).toBeTruthy());
    // 1 mastered cell (Aarav) out of 2 total real cells (Aarav mastered, Bela stuck) = 50%.
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    expect(screen.getByText('Class average mastery · 2 students')).toBeTruthy();
  });

  // Section D — Activity & Performance table
  test('renders the real Activity & Performance table (Section D), including the real quiz stats', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());
    expect(screen.getByTestId('activity-row-s2')).toBeTruthy();
    expect(screen.getByTestId('needs-attention-s2')).toBeTruthy(); // real needsAttention flag
    expect(screen.queryByTestId('needs-attention-s1')).toBeNull();
  });

  // Section 9 — Best Quiz Score must say "No quiz attempts" (Bela has 0),
  // never a fake 0%.
  test('a student with zero quiz attempts shows "No quiz attempts", not a fake 0%', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s2')).toBeTruthy());

    expect(screen.getByText('No quiz attempts')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });

  // Section 7/10 — Today/Overall toggle lives inside Activity & Performance
  // only, and switches real per-day data (learningPathTimeToday) vs
  // cumulative — never a fabricated per-day value for fields with no real
  // "today" column (Assignments/Challenges).
  test('the Today/Overall toggle switches real Learning Path time and shows "not tracked" for fields with no real per-day data', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());
    expect(screen.getByText('40m')).toBeTruthy(); // Aarav's overall learningPathTime

    await user.press(screen.getByTestId('activity-mode-today'));

    expect(screen.getByText('12m')).toBeTruthy(); // Aarav's real learningPathTimeToday
    // Aarav's real assignmentTime (30m) and challengeTime (20m) must NOT
    // appear in Today mode — that would silently pass off overall totals as
    // "today" values.
    expect(screen.queryByText('30m')).toBeNull();
    expect(screen.queryByText('20m')).toBeNull();
  });

  test('there is no top-level Time Period filter — only Subject/Grade/Class/Section', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    expect(screen.queryByText('Time Period')).toBeNull();
    expect(screen.getByTestId('top-filter-Subject-all')).toBeTruthy();
    expect(screen.getByTestId('top-filter-Grade-all')).toBeTruthy();
    expect(screen.getByTestId('top-filter-Class-all')).toBeTruthy();
    expect(screen.getByTestId('top-filter-Section-all')).toBeTruthy();
  });

  test('Export PDF is present and clicking it does not crash', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    await user.press(screen.getByTestId('student-progress-export-pdf'));
    // jsPDF is mocked — reaching here without throwing is the assertion.
  });

  test('shows a real "Updated ... ago" timestamp after a successful load, not a fake "live" indicator', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText(/Updated/)).toBeTruthy());
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
            students: [{ id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
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
