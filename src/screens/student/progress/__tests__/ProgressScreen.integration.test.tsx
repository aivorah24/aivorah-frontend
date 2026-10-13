// Integration test for ProgressScreen — the real screen, driven through a
// mocked global.fetch routed by URL. Overall % and Subject Performance use the
// Dashboard's chapter list (/curriculum/subjects + curated syllabus mastery).

import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import ProgressScreen from '../ProgressScreen';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }),
  useRoute: () => ({ key: 'Progress', name: 'Progress' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888',
    textDim: '#666', accentYellow: '#fa0', accentGreen: '#0a0',
  } }),
}));

let mockUser: any;
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockStats: any;
jest.mock('../../../../context/StudentDataContext', () => {
  const actual = jest.requireActual('../../../../context/StudentDataContext');
  return {
    ...actual,
    useStudentData: () => ({ stats: mockStats, studentId: 's1' }),
  };
});

// chapter title -> topic names, per subject
let mockSyllabus: Record<string, Record<string, string[]>>;
jest.mock('../../../../data/syllabusRegistry', () => ({
  getSubjectSyllabus: (_c: string, _g: string, subject: string) =>
    Object.entries(mockSyllabus[subject] ?? {}).map(([title, topics]) => ({ title, topics: topics.map(name => ({ name })) })),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function baseStats(overrides: any = {}) {
  return {
    xpPoints: 100, level: 1, currentStreak: 0, studyTimeMinutes: 0,
    completedTopics: [], totalTopics: 0, challengesCompleted: 0,
    ...overrides,
  };
}

function navProp() {
  return { openDrawer: jest.fn(), navigate: jest.fn() };
}

function subjectsBody() {
  return {
    subjects: Object.entries(mockSyllabus).map(([subject, chs]) => ({
      subject, chapters: Object.keys(chs).map(title => ({ title })),
    })),
  };
}

function mockFetchRoutes({ weekly, subjects, performance }: any = {}) {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/weekly')) return jsonRes(weekly ?? { days: [] });
    if (url.includes('/curriculum/subjects')) return subjects === 'fail' ? Promise.reject(new Error('down')) : jsonRes(subjects ?? subjectsBody());
    if (url.includes('/performance')) return jsonRes(performance ?? { topics: {}, avgScore: null });
    return jsonRes({});
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { name: 'A Student', email: 'a@a.com', grade: 'Grade 6', curriculum: 'CBSE' };
  mockStats = baseStats();
  mockSyllabus = {
    Science: { 'Ch1': ['s1a', 's1b'], 'Ch2': ['s2a'] },
    Mathematics: { 'M1': ['m1a'], 'M2': ['m2a'] },
  };
});

describe('ProgressScreen — hero (B005)', () => {
  test('overall % = mastered chapters / Dashboard chapter total, never "N of 0"', async () => {
    mockStats = baseStats({ completedTopics: ['s1a', 's1b', 'm1a'], totalTopics: 0, currentStreak: 3, level: 2 });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('2 of 4 chapters mastered · 3-day streak · Level 2')).toBeTruthy());
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
  });

  test('ignores a broken server totalTopics (Qdrant down → 0) entirely', async () => {
    mockStats = baseStats({ completedTopics: ['s2a'], totalTopics: 0, currentStreak: 1 });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('1 of 4 chapters mastered · 1-day streak · Level 1')).toBeTruthy());
    expect(screen.queryByText(/of 0/)).toBeNull();
  });

  test('topics done but no chapter fully mastered is a real 0%, with Topics Done still counted', async () => {
    mockStats = baseStats({ completedTopics: ['s1a', 'unrelated topic'] });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('0 of 4 chapters mastered · 0-day streak · Level 1')).toBeTruthy());
    expect(screen.getByText('Topics Done')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  test('a mastery-level quiz score also masters a chapter (same rule as Dashboard)', async () => {
    mockFetchRoutes({ performance: { topics: { m2a: { avgScore: 95 } }, avgScore: 95 } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('1 of 4 chapters mastered · 0-day streak · Level 1')).toBeTruthy());
  });

  test('chapter list fetch failure hides the fraction instead of showing "N of 0"', async () => {
    mockStats = baseStats({ completedTopics: ['s1a', 's1b'], currentStreak: 1 });
    mockFetchRoutes({ subjects: 'fail' });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('1-day streak · Level 1')).toBeTruthy());
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.queryByText(/of 0/)).toBeNull();
  });

  test('while chapters are still loading, no fraction is shown; it appears once loaded', async () => {
    let resolveSubjects: (v: any) => void = () => {};
    mockStats = baseStats({ completedTopics: ['s2a'] });
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/curriculum/subjects')) return new Promise(r => { resolveSubjects = r; });
      if (url.includes('/performance')) return jsonRes({ topics: {}, avgScore: null });
      return jsonRes({ days: [] });
    }) as any;

    await render(<ProgressScreen navigation={navProp()} />);
    await waitFor(() => expect(screen.getByText('0-day streak · Level 1')).toBeTruthy());

    resolveSubjects(await jsonRes(subjectsBody()));
    await waitFor(() => expect(screen.getByText('1 of 4 chapters mastered · 0-day streak · Level 1')).toBeTruthy());
  });

  test('a grade change re-fetches the chapter list for the new grade', async () => {
    mockFetchRoutes();
    const { rerender } = await render(<ProgressScreen navigation={navProp()} />);
    await waitFor(() => expect(screen.getByText(/of 4 chapters mastered/)).toBeTruthy());

    mockUser = { ...mockUser, grade: 'Grade 7' };
    mockSyllabus = { Science: { 'G7a': ['x'], 'G7b': ['y'], 'G7c': ['z'] } };
    mockFetchRoutes();
    await rerender(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText(/of 3 chapters mastered/)).toBeTruthy());
    expect((global.fetch as jest.Mock).mock.calls.some(([u]) => String(u).includes('grade=Grade%207'))).toBe(true);
  });

  test('Study Time and XP render independently from their own stats fields', async () => {
    mockStats = baseStats({ studyTimeMinutes: 75, xpPoints: 1325 });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('1,325')).toBeTruthy());
    expect(screen.getByText('1h 15m')).toBeTruthy();
  });

  test.each([
    [['s1a', 's1b'], 'Great start, keep going!'],           // 1/4 = 25%
    [['s1a', 's1b', 's2a', 'm1a'], 'Amazing progress this week!'], // 3/4 = 75%
    [['s1a', 's1b', 's2a', 'm1a', 'm2a'], 'Outstanding work!'],    // 4/4
  ])('hero title follows the chapter %%', async (done, expectedTitle) => {
    mockStats = baseStats({ completedTopics: done });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText(expectedTitle)).toBeTruthy());
  });

  test('XP-to-next-level progress from xpForNextLevel', async () => {
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('XP to Level 2')).toBeTruthy());
    expect(screen.getByText('100 / 500')).toBeTruthy();
  });
});

describe('ProgressScreen — weekly activity', () => {
  test('has no Month tab', async () => {
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Weekly Activity')).toBeTruthy());
    expect(screen.queryByText('Month')).toBeNull();
    expect(screen.queryByText('Monthly Activity')).toBeNull();
  });

  test('empty-activity message when every day has zero minutes and xp', async () => {
    mockFetchRoutes({ weekly: { days: [{ date: '2026-08-19', day: 'Wed', studyMinutes: 0, xp: 0, topicsCompleted: 0 }] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('No activity yet this week.\nComplete lessons to see your chart!')).toBeTruthy());
  });

  test('per-day minutes and weekly totals', async () => {
    mockFetchRoutes({
      weekly: { days: [
        { date: '2026-08-18', day: 'Tue', studyMinutes: 40, xp: 20, topicsCompleted: 2 },
        { date: '2026-08-19', day: 'Wed', studyMinutes: 20, xp: 10, topicsCompleted: 1 },
      ] },
    });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('40m')).toBeTruthy());
    expect(screen.getByText('20m')).toBeTruthy();
    expect(screen.getByText('+30')).toBeTruthy();
    expect(screen.getByText('1h')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  test('loading spinner before the weekly data resolves', async () => {
    const pending: { resolve: (v: any) => void }[] = [];
    global.fetch = jest.fn(() => new Promise((resolve) => { pending.push({ resolve }); })) as any;

    await render(<ProgressScreen navigation={navProp()} />);

    expect(screen.getByText('Loading your progress…')).toBeTruthy();

    pending.forEach(p => p.resolve(jsonRes({ days: [] })));
    await waitFor(() => expect(screen.queryByText('Loading your progress…')).toBeNull());
  });
});

describe('ProgressScreen — Subject Performance', () => {
  test('one card per subject with chapters mastered / chapters total', async () => {
    mockStats = baseStats({ completedTopics: ['s1a', 's1b'] });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Science')).toBeTruthy());
    expect(screen.getByText('1 / 2 chapters')).toBeTruthy();
    expect(screen.getByText('0 / 2 chapters')).toBeTruthy();
  });

  test('chapter list fetch failure shows the empty state, no crash', async () => {
    mockFetchRoutes({ subjects: 'fail' });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Complete lessons to see subject scores.')).toBeTruthy());
  });

  test('zero subjects (not a failure) shows the empty state', async () => {
    mockFetchRoutes({ subjects: { subjects: [] } });

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Complete lessons to see subject scores.')).toBeTruthy());
  });

  test('a Grade 11 student with no curriculum set queries NCERT, not IB PYP', async () => {
    mockUser = { name: 'A Student', email: 'a@a.com', grade: 'Grade 11', curriculum: undefined };
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Science')).toBeTruthy());
    const subjUrl = (global.fetch as jest.Mock).mock.calls.map(([u]) => String(u)).find(u => u.includes('/curriculum/subjects'));
    expect(subjUrl).toContain('curriculum=NCERT');
  });
});

describe('ProgressScreen — Completed Topics list', () => {
  test('hidden when no topics are completed', async () => {
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Achievements')).toBeTruthy());
    expect(screen.queryByText('Completed Topics')).toBeNull();
  });

  test('chips for up to 6 completed topics', async () => {
    mockStats = baseStats({ completedTopics: ['Fractions', 'Decimals'] });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Fractions')).toBeTruthy());
    expect(screen.getByText('Decimals')).toBeTruthy();
    expect(screen.queryByText(/more$/)).toBeNull();
  });

  test('"+N more" chip when more than 6 topics are completed', async () => {
    mockStats = baseStats({ completedTopics: Array.from({ length: 9 }, (_, i) => `Topic ${i}`) });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('+3 more')).toBeTruthy());
  });
});

describe('ProgressScreen — navigation', () => {
  test('pressing a subject card navigates to LearningPaths', async () => {
    mockFetchRoutes();
    const nav = navProp();
    const user = userEvent.setup();

    await render(<ProgressScreen navigation={nav} />);
    await waitFor(() => expect(screen.getByText('Mathematics')).toBeTruthy());

    await user.press(screen.getByText('Mathematics'));

    expect(nav.navigate).toHaveBeenCalledWith('LearningPaths');
  });

  test('pressing "See all" under Completed Topics navigates to LearningPaths', async () => {
    mockStats = baseStats({ completedTopics: ['Fractions'] });
    mockFetchRoutes();
    const nav = navProp();
    const user = userEvent.setup();

    await render(<ProgressScreen navigation={nav} />);
    await waitFor(() => expect(screen.getByText('See all →')).toBeTruthy());

    await user.press(screen.getByText('See all →'));

    expect(nav.navigate).toHaveBeenCalledWith('LearningPaths');
  });
});

describe('ProgressScreen — achievements', () => {
  test('unlocks achievements based on stat thresholds', async () => {
    mockStats = baseStats({
      completedTopics: Array.from({ length: 10 }, (_, i) => `t${i}`),
      currentStreak: 1, xpPoints: 500, studyTimeMinutes: 60, level: 2, challengesCompleted: 1,
    });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('8/8 unlocked')).toBeTruthy());
  });

  test('a brand-new student shows 0 unlocked achievements', async () => {
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('0/8 unlocked')).toBeTruthy());
    expect(screen.getAllByTestId('achievement-locked').length).toBe(8);
    expect(screen.queryByText('Unlocked')).toBeNull();
  });

  test('unlocked cards get an "Unlocked" badge; locked ones show progress toward the goal', async () => {
    mockStats = baseStats({ completedTopics: ['t1', 't2'], xpPoints: 325, studyTimeMinutes: 12, currentStreak: 1 });
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('2/8 unlocked')).toBeTruthy());
    expect(screen.getAllByText('Unlocked').length).toBe(2); // streak + first topic
    expect(screen.getByText('2 / 5 topics')).toBeTruthy();
    expect(screen.getByText('325 / 500 XP')).toBeTruthy();
    expect(screen.getByText('12 / 60 min')).toBeTruthy();
  });
});

describe('ProgressScreen — firstName fallback', () => {
  test('falls back to "there" when the user has no name', async () => {
    mockUser = { email: 'a@a.com', grade: 'Grade 6', curriculum: 'CBSE' };
    mockFetchRoutes();

    await render(<ProgressScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Track your growth and achievements, there.')).toBeTruthy());
  });
});
