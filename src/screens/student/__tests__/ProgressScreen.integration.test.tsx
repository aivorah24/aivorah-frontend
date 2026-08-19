// Integration test for ProgressScreen — the real screen, driven through a
// mocked global.fetch routed by URL. Covers the hero stats/XP bar, weekly
// activity chart, achievements, and the Subject Performance section (which
// depends on a real /curriculum fetch — previously never fired at all,
// leaving that section permanently empty; see ProgressScreen.tsx for the fix).

import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import ProgressScreen from '../ProgressScreen';
import { prefetchStudentDashboard } from '../../../utils/curriculumPrefetch';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }),
  useRoute: () => ({ key: 'Progress', name: 'Progress' }),
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888',
    textDim: '#666', accentYellow: '#fa0', accentGreen: '#0a0',
  } }),
}));

let mockUser: any;
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockStats: any;
jest.mock('../../../context/StudentDataContext', () => {
  const actual = jest.requireActual('../../../context/StudentDataContext');
  return {
    ...actual,
    useStudentData: () => ({ stats: mockStats, studentId: 's1' }),
  };
});

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function baseStats(overrides: any = {}) {
  return {
    xpPoints: 100, level: 1, currentStreak: 0, studyTimeMinutes: 0,
    completedTopics: [], totalTopics: 10, challengesCompleted: 0,
    ...overrides,
  };
}

function navProp() {
  return { openDrawer: jest.fn(), navigate: jest.fn() };
}

function mockFetchRoutes({ weekly, curriculum, curriculumUrl = '/curriculum' }: any) {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/weekly')) return jsonRes(weekly ?? { days: [] });
    if (url.includes(curriculumUrl)) return jsonRes(curriculum ?? { topics: [], totalTopics: 0 });
    return jsonRes({});
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { name: 'A Student', email: 'a@a.com', grade: 'Grade 4', curriculum: 'IB PYP' };
  mockStats = baseStats();
});

describe('ProgressScreen — hero stats', () => {
  test('shows the real overall percentage and streak/level summary', async () => {
    mockStats = baseStats({ completedTopics: ['t1', 't2'], totalTopics: 10, currentStreak: 3, level: 2 });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('20%')).toBeTruthy());
    expect(screen.getByText('2 of 10 topics completed · 3-day streak · Level 2')).toBeTruthy();
  });

  test('a zero totalTopics shows a real 0% instead of dividing by zero', async () => {
    mockStats = baseStats({ totalTopics: 0 });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('0%')).toBeTruthy());
    expect(screen.getByText('Ready to start learning!')).toBeTruthy();
  });

  test.each([
    [49, 'Great start, keep going!'],
    [79, 'Amazing progress this week!'],
    [80, 'Outstanding work!'],
  ])('shows the real hero title for %i%% completion', async (pct, expectedTitle) => {
    mockStats = baseStats({ completedTopics: Array.from({ length: pct }, (_, i) => `t${i}`), totalTopics: 100 });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText(expectedTitle)).toBeTruthy());
  });

  test('shows the real XP-to-next-level progress from xpForNextLevel', async () => {
    mockStats = baseStats({ xpPoints: 100 });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('XP to Level 2')).toBeTruthy());
    expect(screen.getByText('100 / 500')).toBeTruthy();
  });
});

describe('ProgressScreen — weekly activity', () => {
  test('shows the real empty-activity message when every day has zero minutes and xp', async () => {
    mockFetchRoutes({ weekly: { days: [{ date: '2026-08-19', day: 'Wed', studyMinutes: 0, xp: 0, topicsCompleted: 0 }] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('No activity yet this week.\nComplete lessons to see your chart!')).toBeTruthy());
  });

  test('shows real per-day minutes and weekly totals when there is real activity', async () => {
    mockFetchRoutes({
      weekly: { days: [
        { date: '2026-08-18', day: 'Tue', studyMinutes: 30, xp: 20, topicsCompleted: 1 },
        { date: '2026-08-19', day: 'Wed', studyMinutes: 15, xp: 10, topicsCompleted: 0 },
      ] },
    });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('30m')).toBeTruthy());
    expect(screen.getByText('15m')).toBeTruthy();
    expect(screen.getByText('+30')).toBeTruthy(); // total XP earned this week
  });

  test('shows the real weekly Total Study time and Topics totals, not just XP', async () => {
    mockFetchRoutes({
      weekly: { days: [
        { date: '2026-08-18', day: 'Tue', studyMinutes: 40, xp: 20, topicsCompleted: 2 },
        { date: '2026-08-19', day: 'Wed', studyMinutes: 20, xp: 10, topicsCompleted: 1 },
      ] },
    });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Total Study')).toBeTruthy());
    expect(screen.getByText('1h')).toBeTruthy(); // formatStudyTime(60)
    expect(screen.getByText('3')).toBeTruthy(); // total topics completed this week
  });

  test('shows a real loading spinner before the weekly data resolves', async () => {
    // Every fetch call (weekly + curriculum) gets its own deferred promise so
    // none are left dangling into later tests once this one finishes.
    const pending: { resolve: (v: any) => void }[] = [];
    global.fetch = jest.fn(() => new Promise((resolve) => { pending.push({ resolve }); })) as any;

    await render(<ProgressScreen navigation={navProp()} />);

    expect(screen.getByText('Loading your progress…')).toBeTruthy();

    pending.forEach(p => p.resolve(jsonRes({ days: [] })));
    await waitFor(() => expect(screen.queryByText('Loading your progress…')).toBeNull());
  });
});

describe('ProgressScreen — Subject Performance (previously broken, now fixed)', () => {
  test('fetches real IB PYP curriculum data and shows real per-subject completion percentages', async () => {
    mockStats = baseStats({ completedTopics: ['Fractions'], totalTopics: 2 });
    mockFetchRoutes({
      weekly: { days: [] },
      curriculum: {
        topics: [
          { grade: 'Grade 4', subject: 'Mathematics', unit: 'Numbers', topic: 'Fractions' },
          { grade: 'Grade 4', subject: 'Mathematics', unit: 'Numbers', topic: 'Decimals' },
        ],
        totalTopics: 2,
      },
    });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Mathematics')).toBeTruthy());
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0); // hero overall % + Mathematics subject %
    expect(screen.getByText('1 / 2 topics')).toBeTruthy();
  });

  test('a real NCERT Grade 3 student hits /ncert/chapters instead of /curriculum', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', grade: 'Grade 3', curriculum: 'NCERT' };
    mockStats = baseStats({ completedTopics: ['Addition'], totalTopics: 1 });
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/weekly')) return jsonRes({ days: [] });
      if (url.includes('/ncert/chapters')) return jsonRes({ grade: 'Grade 3', chapters: [{ topic: 'Addition', unit: 'Numbers' }] });
      return jsonRes({});
    }) as any;

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Mathematics')).toBeTruthy());
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0); // hero overall % + Mathematics subject %
  });

  test('a curriculum fetch failure leaves Subject Performance in its real empty state, no crash', async () => {
    mockFetchRoutes({ weekly: { days: [] } });
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (String(url).includes('/weekly')) return jsonRes({ days: [] });
      return Promise.reject(new Error('down'));
    });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Complete lessons to see subject scores.')).toBeTruthy());
  });

  test('a real warm cache from the Dashboard prefetch is read with no extra curriculum fetch', async () => {
    // Use a grade no other test's default mockUser shares — memCurriculum in
    // utils/curriculumPrefetch.ts is a module-level singleton with no reset
    // hook, so writing to the shared 'Grade 4'/'IB PYP' key here would leak a
    // stale cache hit into every later test that uses the default mockUser.
    const cacheOnlyGrade = 'Grade 7';
    mockUser = { name: 'A Student', email: 'a@a.com', grade: cacheOnlyGrade, curriculum: 'IB PYP' };

    global.fetch = jest.fn((url: string) => {
      if (url.includes('/curriculum')) return jsonRes({ topics: [{ grade: cacheOnlyGrade, subject: 'Mathematics', unit: 'Numbers', topic: 'Fractions' }], totalTopics: 1 });
      return jsonRes({});
    }) as any;
    await prefetchStudentDashboard({ role: 'student', grade: cacheOnlyGrade, curriculum: 'IB PYP' });

    mockStats = baseStats({ completedTopics: ['Fractions'], totalTopics: 1 });
    (global.fetch as jest.Mock).mockClear();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/weekly')) return jsonRes({ days: [] });
      // If Progress hits /curriculum again instead of the warm cache, this
      // would resolve with different (empty) data and the assertion below fails.
      if (url.includes('/curriculum')) return jsonRes({ topics: [], totalTopics: 0 });
      return jsonRes({});
    }) as any;

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Mathematics')).toBeTruthy());
    expect(screen.getByText('1 / 1 topics')).toBeTruthy();
  });

  test('groups real topics from multiple subjects and grades into separate subject cards', async () => {
    mockStats = baseStats({ completedTopics: ['Fractions'], totalTopics: 3 });
    mockFetchRoutes({
      weekly: { days: [] },
      curriculum: {
        topics: [
          { grade: 'Grade 4', subject: 'Mathematics', unit: 'Numbers', topic: 'Fractions' },
          { grade: 'Grade 4', subject: 'Science', unit: 'Matter', topic: 'States of Matter' },
          { grade: 'Grade 5', subject: 'Mathematics', unit: 'Numbers', topic: 'Decimals' },
        ],
        totalTopics: 3,
      },
    });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Mathematics')).toBeTruthy());
    expect(screen.getByText('Science')).toBeTruthy();
    // Mathematics merges across both grades: 1 of 2 Mathematics topics done.
    expect(screen.getByText('1 / 2 topics')).toBeTruthy();
    expect(screen.getByText('0 / 1 topics')).toBeTruthy(); // Science: 0 done
  });

  test('a real curriculum response with zero topics (not a failure) shows the empty subject-scores message', async () => {
    mockFetchRoutes({ weekly: { days: [] }, curriculum: { topics: [], totalTopics: 0 } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Complete lessons to see subject scores.')).toBeTruthy());
  });
});

describe('ProgressScreen — Completed Topics list', () => {
  test('the section is hidden entirely when no topics are completed', async () => {
    mockStats = baseStats({ completedTopics: [] });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Achievements')).toBeTruthy()); // wait for full render
    expect(screen.queryByText('Completed Topics')).toBeNull();
  });

  test('shows real topic chips for up to 6 completed topics', async () => {
    mockStats = baseStats({ completedTopics: ['Fractions', 'Decimals'] });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Fractions')).toBeTruthy());
    expect(screen.getByText('Decimals')).toBeTruthy();
    expect(screen.queryByText(/more$/)).toBeNull();
  });

  test('shows a real "+N more" chip when more than 6 topics are completed', async () => {
    mockStats = baseStats({ completedTopics: Array.from({ length: 9 }, (_, i) => `Topic ${i}`) });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('+3 more')).toBeTruthy());
  });
});

describe('ProgressScreen — navigation', () => {
  test('pressing a real subject card navigates to LearningPaths', async () => {
    mockStats = baseStats({ completedTopics: ['Fractions'], totalTopics: 1 });
    mockFetchRoutes({ weekly: { days: [] }, curriculum: { topics: [{ grade: 'Grade 4', subject: 'Mathematics', unit: 'Numbers', topic: 'Fractions' }], totalTopics: 1 } });
    const nav = navProp();
    const user = userEvent.setup();

    await render(<ProgressScreen navigation={nav} />);
    await waitFor(() => expect(screen.getByText('Mathematics')).toBeTruthy());

    await user.press(screen.getByText('Mathematics'));

    expect(nav.navigate).toHaveBeenCalledWith('LearningPaths');
  });

  test('pressing the real "See all" link under Completed Topics navigates to LearningPaths', async () => {
    mockStats = baseStats({ completedTopics: ['Fractions'], totalTopics: 1 });
    mockFetchRoutes({ weekly: { days: [] } });
    const nav = navProp();
    const user = userEvent.setup();

    await render(<ProgressScreen navigation={nav} />);
    await waitFor(() => expect(screen.getByText('See all →')).toBeTruthy());

    await user.press(screen.getByText('See all →'));

    expect(nav.navigate).toHaveBeenCalledWith('LearningPaths');
  });
});

describe('ProgressScreen — achievements', () => {
  test('unlocks real achievements based on real stat thresholds', async () => {
    mockStats = baseStats({
      completedTopics: Array.from({ length: 10 }, (_, i) => `t${i}`),
      currentStreak: 1, xpPoints: 500, studyTimeMinutes: 60, level: 2, challengesCompleted: 1,
    });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('8/8 unlocked')).toBeTruthy());
  });

  test('a brand-new student with zero progress shows 0 unlocked achievements', async () => {
    mockStats = baseStats();
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('0/8 unlocked')).toBeTruthy());
    expect(screen.getAllByText('Locked').length).toBe(8);
  });

  test('unlocks only the real achievements whose threshold is exactly met, at a boundary value', async () => {
    // Exactly 5 completed topics: "First Topic" (>=1) and "5 Topics Done" (>=5)
    // unlock; "10 Topics Done" (>=10) and the streak achievement (streak=0, needs >=1) don't.
    mockStats = baseStats({
      completedTopics: Array.from({ length: 5 }, (_, i) => `t${i}`),
      currentStreak: 0, xpPoints: 0, studyTimeMinutes: 0, level: 1, challengesCompleted: 0,
    });
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('2/8 unlocked')).toBeTruthy());
    expect(screen.getAllByText('Locked').length).toBe(6);
  });
});

describe('ProgressScreen — firstName fallback', () => {
  test('falls back to the real "there" greeting when the user has no name', async () => {
    mockUser = { email: 'a@a.com', grade: 'Grade 4', curriculum: 'IB PYP' };
    mockFetchRoutes({ weekly: { days: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Track your growth and achievements, there.')).toBeTruthy());
  });
});
