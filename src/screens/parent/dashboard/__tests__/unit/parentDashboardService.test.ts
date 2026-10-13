import {
  mapChild, fetchChildren, fetchCredentials, fetchAIReport,
  fetchWeeklyActivity, fetchAssignments, fetchAttendanceSummary,
} from '../../services/parentDashboardService';
jest.mock('../../../../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok') } },
}));


function rawChild(overrides: Record<string, any> = {}) {
  return {
    id: 'c1', name: 'Anaya', grade: 'Grade 4', curriculum: 'IB PYP', school: 'TSRA',
    totalTopics: 20, xpPoints: 500, completedTopics: ['Fractions'], currentStreak: 3,
    studyTimeMinutes: 60, assignmentsDone: 2, challengesCompleted: 1, lastLesson: 'Decimals',
    ...overrides,
  };
}

describe('mapChild — real status derivation', () => {
  const today = new Date().toISOString();
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

  test('child added today who already logged in -> getting_started, not needs_attention', () => {
    expect(mapChild(rawChild({ addedAt: today, lastActive: today, completedTopics: [] })).status).toBe('getting_started');
  });

  test('not active for 7+ days -> needs_attention', () => {
    expect(mapChild(rawChild({ addedAt: daysAgo(60), lastActive: daysAgo(8) })).status).toBe('needs_attention');
  });

  test('established and recently active -> tagged by progress', () => {
    const base = { addedAt: daysAgo(60), lastActive: today, totalTopics: 10 };
    expect(mapChild(rawChild({ ...base, completedTopics: ['a', 'b', 'c', 'd', 'e'] })).status).toBe('excelling');
    expect(mapChild(rawChild({ ...base, completedTopics: ['a', 'b'] })).status).toBe('on_track');
    expect(mapChild(rawChild({ ...base, completedTopics: ['a'] })).status).toBe('keep_going');
  });

  test('missing optional fields default safely, not undefined/NaN', () => {
    const result = mapChild({ id: 'c2', name: 'Rohan', grade: 'Grade 2' });
    expect(result).toEqual({
      id: 'c2', name: 'Rohan', grade: 'Grade 2', curriculum: '', totalTopics: 0, school: '',
      status: 'getting_started', lastActive: null, xpPoints: 0, completedTopics: [], currentStreak: 0,
      studyTimeMinutes: 0, assignmentsDone: 0, challengesCompleted: 0, lastLesson: '',
    });
  });
});

describe('fetchChildren', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('a real non-empty array is mapped through mapChild', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => [rawChild()] }) as any;
    const result = await fetchChildren('parent@test.com');
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe('Anaya');
  });

  test('an empty array (no real linked children) -> null, not an empty array — lets the screen show its real empty state', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => [] }) as any;
    expect(await fetchChildren('parent@test.com')).toBeNull();
  });

  test('a non-array response (e.g. an error object) -> null, not a crash', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ error: 'down' }) }) as any;
    expect(await fetchChildren('parent@test.com')).toBeNull();
  });
});

describe('fetchCredentials / fetchAIReport — real ok-gated fetches', () => {
  test('fetchCredentials returns real data when the response is ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ username: 'anaya1' }) }) as any;
    expect(await fetchCredentials('parent@test.com', 'c1')).toEqual({ username: 'anaya1' });
  });

  test('fetchCredentials returns null on a real non-ok response, not a thrown error', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
    expect(await fetchCredentials('parent@test.com', 'c1')).toBeNull();
  });

  test('fetchAIReport returns null on a real non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
    expect(await fetchAIReport('parent@test.com', 'c1')).toBeNull();
  });
});

describe('fetchWeeklyActivity / fetchAssignments / fetchAttendanceSummary — real pass-through fetches', () => {
  test('fetchWeeklyActivity returns the real parsed body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ days: [] } ) }) as any;
    expect(await fetchWeeklyActivity('c1')).toEqual({ days: [] });
  });

  test('fetchAssignments returns the real parsed body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => [] }) as any;
    expect(await fetchAssignments('c1')).toEqual([]);
  });

  test('fetchAttendanceSummary reads the attendance service, signed in, and keeps a null rate', async () => {
    const body = { summary: { present: 0, absent: 0, late: 0, total: 0, ratePct: null }, history: [] };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => body }) as any;
    expect(await fetchAttendanceSummary('c1')).toEqual(body);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/aivorah-attendance-service.*\/attendance\/student\/c1\/summary$|localhost:3022\/attendance\/student\/c1\/summary$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
  });
});
