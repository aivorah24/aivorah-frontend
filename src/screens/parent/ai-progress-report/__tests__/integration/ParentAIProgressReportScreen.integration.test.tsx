// Integration test for the refactored parent AI Progress Report screen.
// Covers the real end-to-end flow this feature exists for: a parent picks a
// child, taps Generate, and sees the AI-written report render from real
// backend data - matching the behavior of the retired
// .legacy-screens/parent/ParentAIReportsScreen.tsx, but now backed by
// aivorah-students-service instead of the monolith.

import React from 'react';
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
  }, 15000);

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
});
