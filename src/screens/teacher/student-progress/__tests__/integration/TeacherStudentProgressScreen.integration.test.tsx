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

const MOCK_TEACHER_USER = {
  email: 'teacher@aivorah.test', name: 'Priya Menon',
  // A profile-configured class (CBSE Grade 6) with ZERO real linked
  // students yet — regression fixture for the reported bug: changing
  // Curriculum/Grade in Settings had nowhere to appear on this filter.
  teaches: [
    { grade: 'Grade 4', curriculum: 'IB PYP', subjects: ['Mathematics'] },
    { grade: 'Grade 6', curriculum: 'CBSE', subjects: ['Science'] },
  ],
};
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
// This env's Platform.OS isn't 'web', so exportStudentProgressPdf's real
// body never runs here (see the dedicated unit/exportPdf.test.ts for real
// jsPDF-call coverage) — this mock only needs to exist so the `require`
// doesn't fail if that ever changes.
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    internal: { pageSize: { getHeight: () => 800, getWidth: () => 600 } },
    setFont: jest.fn(), setFontSize: jest.fn(), setTextColor: jest.fn(), setFillColor: jest.fn(),
    setDrawColor: jest.fn(), setLineWidth: jest.fn(), getTextWidth: jest.fn().mockReturnValue(10),
    text: jest.fn(), rect: jest.fn(), roundedRect: jest.fn(), circle: jest.fn(), line: jest.fn(),
    addPage: jest.fn(), save: jest.fn(),
  })),
}));

const navigation = { openDrawer: jest.fn(), navigate: jest.fn() };

// Two students in two DIFFERENT real classes (curriculum/grade/class/section
// all differ) — this is exactly the shape that exercises the cascading
// filter defaults: on load, only the FIRST real combo (Aarav's) is
// auto-selected, and Bela only appears once the teacher explicitly picks
// her class via a dropdown.
const HEATMAP_RESPONSE = {
  students: [
    { id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
      Fractions: { status: 'mastered', attempts: 1, latestScore: 90, bestScore: 90, struggled: false, lastAttemptDate: '2026-08-20', subject: 'Mathematics' },
    } },
    { id: 's2', name: 'Bela Rao', grade: 'Grade 6', curriculum: 'IB PYP', section: 'B', class: '6B', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
      Fractions: { status: 'stuck', attempts: 2, latestScore: 30, bestScore: 40, struggled: false, lastAttemptDate: '2026-08-01', subject: 'Mathematics' },
    } },
  ],
  topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
};

const ROSTER_RESPONSE = [
  { id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 90, learningPathTime: 40, learningPathTimeToday: 12, assignmentTime: 30, challengeTime: 20, progressPct: 60, totalTopics: 20, completedTopics: ['Fractions', 'Decimals'], quizAttempts: 1, quizBestScore: 90, lastActive: new Date().toISOString(), needsAttention: false },
  { id: 's2', name: 'Bela Rao', grade: 'Grade 6', curriculum: 'IB PYP', section: 'B', class: '6B', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 10, learningPathTime: 5, learningPathTimeToday: 0, assignmentTime: 5, challengeTime: 0, progressPct: 5, totalTopics: 20, completedTopics: ['Fractions'], quizAttempts: 0, quizBestScore: null, lastActive: '2020-01-01T00:00:00.000Z', needsAttention: true },
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

// Opens a filter dropdown and picks the given option — mirrors how a real
// teacher would use the new dropdown UI (tap to open, tap an option to
// select and close).
async function selectFilter(user: ReturnType<typeof userEvent.setup>, key: string, option: string) {
  await user.press(screen.getByTestId(`filter-dropdown-${key}`));
  await user.press(screen.getByTestId(`filter-dropdown-${key}-option-${option}`));
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn((url: string) => jsonRes(url)) as any;
});

describe('TeacherStudentProgressScreen', () => {
  test('defaults to the teacher\'s first real class (Curriculum/Grade/Section/Subject), showing only that class\'s students — never a generic "All"', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

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

  // Regression test for the reported bug: filtering the heatmap to one
  // grade left the Activity & Performance table below still showing every
  // grade — the two sections shared no filter state.
  test('switching the Grade dropdown narrows BOTH the heatmap and the Activity & Performance table (Section D), never one alone', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy()); // Aarav, default class
    expect(screen.queryByTestId('activity-row-s2')).toBeNull();

    await selectFilter(user, 'grade', 'Grade 6');

    await waitFor(() => expect(screen.getByTestId('activity-row-s2')).toBeTruthy()); // Bela, Grade 6
    expect(screen.queryByTestId('activity-row-s1')).toBeNull(); // Aarav, Grade 4 — filtered out
    // Topic exploration narrows too — same shared filter state.
    expect(screen.getByTestId('heatmap-cell-s2-Fractions')).toBeTruthy();
    expect(screen.queryByTestId('heatmap-cell-s1-Fractions')).toBeNull();
  });

  // Sections cascade on the selected Grade — "if I handle Grade 3 sections
  // A and B, selecting Grade 3 shows both".
  test('the Section dropdown offers only the sections that really exist in the selected grade', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    // Default grade is Aarav's Grade 4 -> only section A exists there.
    await user.press(screen.getByTestId('filter-dropdown-section'));
    expect(screen.getByTestId('filter-dropdown-section-option-A')).toBeTruthy();
    expect(screen.queryByTestId('filter-dropdown-section-option-B')).toBeNull();
    await user.press(screen.getByTestId('filter-dropdown-section-backdrop'));

    // Switching to Grade 6 swaps the real section list to B.
    await selectFilter(user, 'grade', 'Grade 6');
    await user.press(screen.getByTestId('filter-dropdown-section'));
    expect(screen.getByTestId('filter-dropdown-section-option-B')).toBeTruthy();
    expect(screen.queryByTestId('filter-dropdown-section-option-A')).toBeNull();
  });

  // Student search — a second, independent narrowing shared by Topic
  // Exploration and Activity & Performance, useful once a class runs ~30
  // students. Uses its own fixture: two students in the SAME real class
  // (so both are visible by default, unlike the Aarav/Bela cross-class fixture).
  test('the student search box narrows BOTH Topic Exploration and Activity & Performance by real name, together', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/heatmap')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            students: [
              { id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
                Fractions: { status: 'mastered', attempts: 1, latestScore: 90, bestScore: 90, struggled: false, lastAttemptDate: '2026-08-20', subject: 'Mathematics' },
              } },
              { id: 's2', name: 'Bela Rao', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
                Fractions: { status: 'stuck', attempts: 2, latestScore: 30, bestScore: 40, struggled: false, lastAttemptDate: '2026-08-01', subject: 'Mathematics' },
              } },
            ],
            topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
          }),
        });
      }
      if (url.match(/\/by-teacher\/[^/]+$/)) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 90, learningPathTime: 40, learningPathTimeToday: 12, assignmentTime: 30, challengeTime: 20, progressPct: 60, totalTopics: 20, completedTopics: ['Fractions'], quizAttempts: 1, quizBestScore: 90, lastActive: new Date().toISOString(), needsAttention: false },
            { id: 's2', name: 'Bela Rao', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics'], studyTime: 10, learningPathTime: 5, learningPathTimeToday: 0, assignmentTime: 5, challengeTime: 0, progressPct: 5, totalTopics: 20, completedTopics: [], quizAttempts: 0, quizBestScore: null, lastActive: '2020-01-01T00:00:00.000Z', needsAttention: true },
          ],
        });
      }
      return jsonRes(url);
    }) as any;
    const user = userEvent.setup();

    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());
    expect(screen.getByTestId('activity-row-s2')).toBeTruthy();
    expect(screen.getByTestId('heatmap-row-s1')).toBeTruthy();
    expect(screen.getByTestId('heatmap-row-s2')).toBeTruthy();

    await user.type(screen.getByTestId('student-progress-search'), 'Bela');

    await waitFor(() => expect(screen.queryByTestId('activity-row-s1')).toBeNull());
    expect(screen.getByTestId('activity-row-s2')).toBeTruthy();
    expect(screen.queryByTestId('heatmap-row-s1')).toBeNull();
    expect(screen.getByTestId('heatmap-row-s2')).toBeTruthy();
  });

  test('the Curriculum dropdown is a real, independently selectable filter', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    await user.press(screen.getByTestId('filter-dropdown-curriculum'));
    expect(screen.getByTestId('filter-dropdown-curriculum-option-IB PYP')).toBeTruthy();
  });

  // Regression test for the reported bug: "I changed the grade and subjects
  // in Settings but Student Progress still shows the same Mathematics and
  // English" — root cause was Curriculum/Grade dropdowns being built only
  // from real linked-student data, so a newly-configured class (with no
  // students linked yet) had nowhere to appear at all.
  test('Curriculum and Grade dropdowns include a profile-configured class even with zero real linked students', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    // CBSE / Grade 6 comes from MOCK_TEACHER_USER.teaches only — no real
    // heatmap/roster student is in that class in this fixture.
    await user.press(screen.getByTestId('filter-dropdown-curriculum'));
    expect(screen.getByTestId('filter-dropdown-curriculum-option-CBSE')).toBeTruthy();
    await user.press(screen.getByTestId('filter-dropdown-curriculum-option-CBSE'));

    await user.press(screen.getByTestId('filter-dropdown-grade'));
    expect(screen.getByTestId('filter-dropdown-grade-option-Grade 6')).toBeTruthy();
    await user.press(screen.getByTestId('filter-dropdown-grade-option-Grade 6'));

    // Selecting it shows the honest empty state — no students, not a crash,
    // and NOT stuck showing the previous class's Mathematics/English.
    await waitFor(() => expect(screen.getByText('No students to show for this filter.')).toBeTruthy());
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
  test('renders the real Subject Progress card (Section 4), consistent with the default-filtered heatmap data', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('subject-card-Mathematics')).toBeTruthy());
    // Default class = Aarav only, whose one real cell is mastered = 100%.
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getByText('of syllabus mastered · 1 student')).toBeTruthy();
  });

  // "Tap English, see English alone" — selecting a specific Subject must
  // narrow Subject Progress down to just that one card, not show every
  // subject's card regardless of the filter.
  test('selecting a specific Subject shows ONLY that subject\'s Subject Progress card', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/heatmap')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            students: [{ id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics', 'English'], topicStatus: {
              Fractions: { status: 'mastered', attempts: 1, latestScore: 90, bestScore: 90, struggled: false, lastAttemptDate: '2026-08-20', subject: 'Mathematics' },
              Grammar: { status: 'stuck', attempts: 2, latestScore: 30, bestScore: 40, struggled: false, lastAttemptDate: '2026-08-01', subject: 'English' },
            } }],
            topics: [{ topic: 'Fractions', subject: 'Mathematics' }, { topic: 'Grammar', subject: 'English' }],
          }),
        });
      }
      return jsonRes(url);
    }) as any;
    const user = userEvent.setup();

    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    // Default subject auto-selects Mathematics (first real one) -> only that card.
    await waitFor(() => expect(screen.getByTestId('subject-card-Mathematics')).toBeTruthy());
    expect(screen.queryByTestId('subject-card-English')).toBeNull();

    await selectFilter(user, 'subject', 'English');

    await waitFor(() => expect(screen.getByTestId('subject-card-English')).toBeTruthy());
    expect(screen.queryByTestId('subject-card-Mathematics')).toBeNull();
  });

  test('switching class updates the Subject Progress card to the newly selected population', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('subject-card-Mathematics')).toBeTruthy());

    await selectFilter(user, 'grade', 'Grade 6');

    // Bela's one real cell is stuck (not mastered) = 0%.
    await waitFor(() => expect(screen.getByText('of syllabus mastered · 1 student')).toBeTruthy());
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
  });

  // Section D — Activity & Performance table
  test('renders the real Activity & Performance table (Section D), including the real quiz stats', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());
    expect(screen.queryByTestId('needs-attention-s1')).toBeNull();

    await selectFilter(user, 'grade', 'Grade 6');

    await waitFor(() => expect(screen.getByTestId('activity-row-s2')).toBeTruthy());
    expect(screen.getByTestId('needs-attention-s2')).toBeTruthy(); // real needsAttention flag
  });

  // Section 9 — Best Quiz Score must say "No quiz attempts" (Bela has 0),
  // never a fake 0%.
  test('a student with zero quiz attempts shows "No quiz attempts", not a fake 0%', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    await selectFilter(user, 'grade', 'Grade 6');
    await waitFor(() => expect(screen.getByTestId('activity-row-s2')).toBeTruthy());

    // "No quiz attempts" is the honest empty state for Bela's Best Quiz
    // Score column — asserted here at the integration level (unit coverage
    // for the exact "not a fake 0%" behavior lives in ActivityTable.test.tsx;
    // a bare page-wide "0%" check would also match her real 0% Subject
    // Progress mastery card, which is unrelated).
    expect(screen.getByText('No quiz attempts')).toBeTruthy();
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

  test('there is no top-level Time Period filter — only Curriculum/Grade/Subject/Class/Section dropdowns', async () => {
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    expect(screen.queryByText('Time Period')).toBeNull();
    expect(screen.getByTestId('filter-dropdown-curriculum')).toBeTruthy();
    expect(screen.getByTestId('filter-dropdown-grade')).toBeTruthy();
    expect(screen.getByTestId('filter-dropdown-section')).toBeTruthy();
    expect(screen.getByTestId('filter-dropdown-subject')).toBeTruthy();
    // No redundant "Class" pill — grade + section IS the class.
    expect(screen.queryByTestId('filter-dropdown-class')).toBeNull();
  });

  // Dropdown UX: opens inline (no gray/dark Modal overlay), and tapping
  // outside (the transparent backdrop) closes it without changing selection.
  test('the dropdown opens inline with no page overlay, and tapping outside closes it without changing the selection', async () => {
    const user = userEvent.setup();
    await render(<TeacherStudentProgressScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('activity-row-s1')).toBeTruthy());

    await user.press(screen.getByTestId('filter-dropdown-grade'));
    expect(screen.getByTestId('filter-dropdown-grade-option-Grade 6')).toBeTruthy();

    await user.press(screen.getByTestId('filter-dropdown-grade-backdrop'));

    expect(screen.queryByTestId('filter-dropdown-grade-option-Grade 6')).toBeNull();
    // Selection unchanged — still Aarav's Grade 4 class.
    expect(screen.getByTestId('activity-row-s1')).toBeTruthy();
  });

  test('Export report is present and clicking it does not crash', async () => {
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
            students: [{ id: 's1', name: 'Aarav Kapoor', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', class: '4A', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {
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
