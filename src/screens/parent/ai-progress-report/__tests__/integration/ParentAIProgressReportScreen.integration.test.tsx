// Integration test for the refactored parent AI Progress Report screen.
// Covers the real end-to-end flow this feature exists for: a parent picks a
// child, taps Generate, and sees the AI-written report render from real
// backend data - matching the behavior of the retired
// .legacy-screens/parent/ParentAIReportsScreen.tsx, but now backed by
// aivorah-students-service instead of the monolith.

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import ParentAIProgressReportScreen from '../../ParentAIProgressReportScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => { cb(); },
  useNavigation: () => ({ navigate: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ name: 'ParentAIReports' }),
}));
jest.mock('../../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ showPermanentSidebar: false }),
}));
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com' } }),
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textMain: '#000', textMuted: '#000', textDim: '#000',
      accentYellow: '#c90', accentGreen: '#0a0', accentRed: '#a00', accentOrange: '#f80',
      bgDark: '#111', cardDark: '#222', borderColor: '#333',
      background: '#fff', card: '#fff', border: '#ccc', text: '#000',
    },
  }),
}));

const CHILD = { id: 'child-1', name: 'Aanya', grade: 'Grade 3' };
const REPORT = {
  student: { name: 'Aanya', grade: 'Grade 3', curriculum: 'CBSE', school: 'Test School' },
  metrics: {
    xp: 500, level: 2, studyTimeMinutes: 300, recentStudyMinutes: 100,
    activeDays: 5, activeDaysThisWeek: 5, avgDailyMinutes: 20, currentStreak: 5,
    topicsCompleted: 3, completedTopics: ['ch1_numbers'],
    assignmentsDone: 3, avgAssignmentScore: 80, assignmentTrend: 'improving',
    challengesCompleted: 2, avgChallengeScore: 70,
  },
  subjectPerformance: [],
  report: {
    learning_pattern_insight: 'Aanya is actively learning and being assessed.',
    whats_going_well: 'Consistent effort across assignments.',
    where_to_focus: 'Keep building on current momentum.',
    subject_insights: [],
    consistency_insight: 'Studying regularly this week.',
    assignment_insight: 'Strong assignment completion.',
    this_week_actions: ['Review Chapter 1 together'],
    message_to_child: 'Great work this week!',
    strong_topics: [],
    weak_topics: [],
    learning_pattern: 'active_learner',
    consistency_level: 'building_habit',
  },
  generatedAt: '2026-09-02T10:00:00.000Z',
};

// Same shape as REPORT, but with strong_topics/weak_topics/subject_insights
// populated - REPORT above leaves them empty so those specific chip/bullet
// render branches (ParentAIProgressReportScreen.tsx ~lines 673-714) were
// otherwise never exercised.
const REPORT_WITH_TOPICS = {
  ...REPORT,
  report: {
    ...REPORT.report,
    subject_insights: [{ subject: 'Maths', insight: 'Strong grasp of multiplication.' }],
    strong_topics: [{ topic: 'Multiplication', score: 92 }],
    weak_topics: [{ topic: 'Fractions', score: 48 }],
  },
};

function mockFetchByUrl(handlers: Record<string, any>) {
  (global as any).fetch = jest.fn((url: string) => {
    // Longest-key-first: /ai-report URLs also contain "/parent/", so the
    // more specific key must win the match, not just insertion order.
    const match = Object.keys(handlers)
      .filter((k) => url.includes(k))
      .sort((a, b) => b.length - a.length)[0];
    const entry = match ? handlers[match] : { ok: true, body: {} };
    return Promise.resolve({
      ok: entry.ok !== false,
      json: async () => entry.body,
    });
  });
}

describe('ParentAIProgressReportScreen', () => {
  test('generating a report for the linked child renders real AI-written content', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/ai-report': { body: REPORT },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{}} />);

    await waitFor(() => {
      expect(screen.queryAllByText('Aanya', { exact: false }).length).toBeGreaterThan(0);
      expect(screen.queryAllByText('Generate', { exact: false }).length).toBeGreaterThan(0);
    }, { timeout: 10000 });

    fireEvent.press(screen.getAllByText('Generate', { exact: true })[0]);

    // Report card actually rendered from the mocked /ai-report response, not
    // a static shell - covers the metrics grid, every ReportSection branch,
    // the message-to-child card, and the Regenerate control.
    await waitFor(() => expect(screen.getByText('Regenerate Report')).toBeTruthy(), { timeout: 10000 });
    expect(screen.getByText('500')).toBeTruthy(); // Total XP
    expect(screen.getAllByText('5d').length).toBeGreaterThan(0); // Streak (metrics grid + consistency chip)
    expect(screen.getByText('80%')).toBeTruthy(); // Avg Score
    expect(screen.getByText(REPORT.report.learning_pattern_insight)).toBeTruthy();
    expect(screen.getByText(REPORT.report.whats_going_well)).toBeTruthy();
    expect(screen.getByText(REPORT.report.where_to_focus)).toBeTruthy();
    expect(screen.getByText(REPORT.report.consistency_insight)).toBeTruthy();
    expect(screen.getByText(REPORT.report.assignment_insight)).toBeTruthy();
    expect(screen.getByText('Review Chapter 1 together')).toBeTruthy();
    expect(screen.getByText(`"${REPORT.report.message_to_child}"`)).toBeTruthy();
    expect(screen.getByText('Trend: improving')).toBeTruthy();

    // Regenerating re-fetches rather than reusing the stale report.
    (global.fetch as jest.Mock).mockClear();
    fireEvent.press(screen.getByText('Regenerate Report'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  }, 15000);

  test('reportData.noData renders the "not enough activity" empty state instead of a report', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/ai-report': { body: { noData: true, student: { name: 'Aanya' } } },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{}} />);
    await waitFor(() => expect(screen.getAllByText('Generate', { exact: true }).length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByText('Generate', { exact: true })[0]);

    await waitFor(() => expect(screen.getByText('Not enough activity yet')).toBeTruthy());
    expect(screen.queryByText('Regenerate Report')).toBeNull();
  });

  test('switching to a second linked child clears the first child\'s report', async () => {
    const CHILD_2 = { id: 'child-2', name: 'Rohan', grade: 'Grade 5' };
    mockFetchByUrl({
      '/parent/': { body: [CHILD, CHILD_2] },
      '/ai-report': { body: REPORT },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{}} />);
    await waitFor(() => expect(screen.getAllByText('Generate', { exact: true }).length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByText('Generate', { exact: true })[0]);
    await waitFor(() => expect(screen.getByText('Regenerate Report')).toBeTruthy());

    fireEvent.press(screen.getByText('Rohan'));

    // selectChild() clears reportData/error - back to the pre-generation hero state.
    await waitFor(() => expect(screen.queryByText('Regenerate Report')).toBeNull());
    expect(screen.getAllByText('Generate', { exact: true }).length).toBeGreaterThan(0);
  });

  test('shows the failure banner and Try again when generation fails, matching the live "Failed to generate report" bug', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/ai-report': { ok: false, body: { error: 'model_not_found' } },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{ params: { childId: 'child-1' } }} />);

    await waitFor(() => expect(screen.getAllByText('model_not_found').length).toBeGreaterThan(0), { timeout: 10000 });
    expect(screen.getAllByText('Try again').length).toBeGreaterThan(0);
  }, 15000);

  test('shows the empty state when the parent has no linked children', async () => {
    mockFetchByUrl({
      '/parent/': { body: [] },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{}} />);

    await waitFor(() => expect(screen.getByText('No children linked')).toBeTruthy());
  });

  test('"Go to My Kids" from the empty state navigates to ParentMyKids', async () => {
    mockFetchByUrl({ '/parent/': { body: [] } });
    const navigation = { navigate: jest.fn(), openDrawer: jest.fn() };

    render(<ParentAIProgressReportScreen navigation={navigation} route={{}} />);
    await waitFor(() => expect(screen.getByText('No children linked')).toBeTruthy());

    fireEvent.press(screen.getByText('Go to My Kids'));
    expect(navigation.navigate).toHaveBeenCalledWith('ParentMyKids');
  });

  test('the hero "Generate Report for {name}" CTA (shown before any report exists) generates a report', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/ai-report': { body: REPORT },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{}} />);
    await waitFor(() => expect(screen.getByText('Generate Report for Aanya')).toBeTruthy());

    fireEvent.press(screen.getByText('Generate Report for Aanya'));
    await waitFor(() => expect(screen.getByText('Regenerate Report')).toBeTruthy(), { timeout: 10000 });
  }, 15000);

  test('pressing "Try again" after a failed generation retries the request', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/ai-report': { ok: false, body: { error: 'model_not_found' } },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{ params: { childId: 'child-1' } }} />);
    await waitFor(() => expect(screen.getAllByText('Try again').length).toBeGreaterThan(0), { timeout: 10000 });

    (global.fetch as jest.Mock).mockClear();
    fireEvent.press(screen.getAllByText('Try again')[0]);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  }, 15000);

  test('renders strong topics, weak topics, and subject-insight bullets when the report includes them', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/ai-report': { body: REPORT_WITH_TOPICS },
    });

    render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{}} />);
    await waitFor(() => expect(screen.getAllByText('Generate', { exact: true }).length).toBeGreaterThan(0));
    fireEvent.press(screen.getAllByText('Generate', { exact: true })[0]);

    await waitFor(() => expect(screen.getByText('Regenerate Report')).toBeTruthy(), { timeout: 10000 });
    expect(screen.getByText('Multiplication · 92%')).toBeTruthy();
    expect(screen.getByText('Fractions · 48%')).toBeTruthy();
    expect(screen.getByText(/Strong grasp of multiplication\./)).toBeTruthy();
  }, 15000);

  test('the selected child chip uses readable gold text, not white on its light tint', async () => {
    mockFetchByUrl({ '/parent/': { body: [CHILD] } });
    await render(<ParentAIProgressReportScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={{}} />);

    const grade = await screen.findByText('Grade 3');
    const name = screen.getAllByText('Aanya', { exact: true }).find((n) => StyleSheet.flatten(n.props.style).fontSize === 13)!;

    expect(StyleSheet.flatten(name.props.style).color).toBe('#c90');
    expect(StyleSheet.flatten(grade.props.style).color).not.toMatch(/^#fff/i);
    expect(StyleSheet.flatten(screen.getByText('A').props.style).color).toBe('#c90');
  });
});
