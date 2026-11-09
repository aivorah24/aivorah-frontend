import CURRENT_AFFAIRS_SERVER_URL from '../../config/currentAffairsServerUrl';
import {
  fetchTodayDigest, fetchDigestList, fetchStory, fetchWeeklyQuiz, checkQuizAnswer, submitQuiz,
  fetchProgress, recordDigestComplete, recordStoryRead, recordQuizComplete,
} from '../currentAffairsApi';

let mockUser: { getIdToken: () => Promise<string> } | null = { getIdToken: async () => 'tok-1' };
jest.mock('../../config/firebase', () => ({
  auth: { get currentUser() { return mockUser; }, authStateReady: async () => {} },
}));

const BASE = `${CURRENT_AFFAIRS_SERVER_URL}/current-affairs`;
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status: number, body: unknown = {}) => ({ ok: false, status, json: async () => body });
const fetchMock = () => global.fetch as jest.Mock;
const lastCall = () => fetchMock().mock.calls[fetchMock().mock.calls.length - 1];

beforeEach(() => {
  mockUser = { getIdToken: async () => 'tok-1' };
  global.fetch = jest.fn().mockResolvedValue(ok({})) as any;
});

test('uses the Render URL by default (no ai-mentor monolith)', () => {
  expect(CURRENT_AFFAIRS_SERVER_URL).toBe('https://aivorah-current-affairs-service.onrender.com');
});

describe('reads', () => {
  test('fetchTodayDigest encodes the age group and student email', async () => {
    fetchMock().mockResolvedValueOnce(ok({ date: '2026-11-09', stories: [] }));
    await expect(fetchTodayDigest('13+', 'Kid+1@school.in')).resolves.toEqual({ date: '2026-11-09', stories: [] });
    expect(lastCall()[0]).toBe(`${BASE}/digest/today?ageGroup=13%2B&studentEmail=Kid%2B1%40school.in`);
  });

  test('fetchTodayDigest leaves out missing params', async () => {
    await fetchTodayDigest('8-12');
    expect(lastCall()[0]).toBe(`${BASE}/digest/today?ageGroup=8-12`);
  });

  test('fetchDigestList defaults to 30 and returns the dates', async () => {
    fetchMock().mockResolvedValueOnce(ok({ dates: [{ date: '2026-11-09', storyCount: 3 }] }));
    await expect(fetchDigestList()).resolves.toEqual([{ date: '2026-11-09', storyCount: 3 }]);
    expect(lastCall()[0]).toBe(`${BASE}/digest/list?limit=30`);
  });

  test('fetchStory unwraps the story', async () => {
    fetchMock().mockResolvedValueOnce(ok({ story: { id: 's1', title: 'T' } }));
    await expect(fetchStory('s1', 'under-8')).resolves.toEqual({ id: 's1', title: 'T' });
    expect(lastCall()[0]).toBe(`${BASE}/story/s1?ageGroup=under-8`);
  });

  test('fetchWeeklyQuiz and fetchProgress', async () => {
    await fetchWeeklyQuiz('8-12', 'a@b.in');
    expect(lastCall()[0]).toBe(`${BASE}/quiz/week?ageGroup=8-12&studentEmail=a%40b.in`);
    fetchMock().mockResolvedValueOnce(ok({ progress: { points: 40 } }));
    await expect(fetchProgress('a@b.in', '8-12')).resolves.toEqual({ points: 40 });
    expect(lastCall()[0]).toBe(`${BASE}/progress/a%40b.in?ageGroup=8-12`);
  });

  test("throws with the service's message, or a fallback with the status", async () => {
    fetchMock().mockResolvedValueOnce(fail(403, { error: 'You can only see or change your own progress' }));
    await expect(fetchProgress('a@b.in')).rejects.toThrow('You can only see or change your own progress');
    fetchMock().mockResolvedValueOnce({ ok: false, status: 502, json: async () => { throw new Error('html'); } });
    await expect(fetchTodayDigest('8-12')).rejects.toThrow("Could not load today's stories (502)");
    fetchMock().mockResolvedValueOnce(fail(404));
    await expect(fetchStory('x', '8-12')).rejects.toThrow('Could not load the story (404)');
  });
});

describe('writes', () => {
  test('submitQuiz posts the answers with the sign-in token', async () => {
    fetchMock().mockResolvedValueOnce(ok({ score: 8, total: 10, percentage: 80 }));
    const answers = [{ questionId: 'q1', answer: 2 }];
    await expect(submitQuiz('a@b.in', '8-12', answers, '2026-11-08')).resolves.toMatchObject({ percentage: 80 });
    const [url, init] = lastCall();
    expect(url).toBe(`${BASE}/quiz/submit`);
    expect(init).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-1' },
      body: JSON.stringify({ studentEmail: 'a@b.in', ageGroup: '8-12', answers, weekStart: '2026-11-08' }),
    });
  });

  test('progress writes go to their endpoints with the token', async () => {
    await recordDigestComplete('a@b.in', 'under-8', 3);
    expect(lastCall()[0]).toBe(`${BASE}/progress/digest-complete`);
    expect(JSON.parse(lastCall()[1].body)).toEqual({ studentEmail: 'a@b.in', ageGroup: 'under-8', storyCount: 3 });

    await recordStoryRead('a@b.in', '13+', 's1', 40);
    expect(lastCall()[0]).toBe(`${BASE}/progress/story-read`);
    expect(JSON.parse(lastCall()[1].body)).toEqual({ studentEmail: 'a@b.in', ageGroup: '13+', storyId: 's1', durationSeconds: 40 });

    await recordQuizComplete('a@b.in', '8-12', 'att-1');
    expect(lastCall()[0]).toBe(`${BASE}/progress/quiz-complete`);
    expect(lastCall()[1].headers.Authorization).toBe('Bearer tok-1');
    expect(JSON.parse(lastCall()[1].body)).toEqual({ studentEmail: 'a@b.in', ageGroup: '8-12', attemptId: 'att-1' });
  });

  test('not signed in: writes are not sent', async () => {
    mockUser = null;
    await expect(recordDigestComplete('a@b.in', '8-12')).rejects.toThrow('Not signed in.');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('checkQuizAnswer needs no sign-in', async () => {
    mockUser = null;
    fetchMock().mockResolvedValueOnce(ok({ correct: true, correctIndex: 1 }));
    await expect(checkQuizAnswer('q1', 1)).resolves.toEqual({ correct: true, correctIndex: 1 });
    expect(JSON.parse(lastCall()[1].body)).toEqual({ questionId: 'q1', answer: 1 });
  });

  test('a failed write throws the service message', async () => {
    fetchMock().mockResolvedValueOnce(fail(404, { error: 'Submit the quiz before completing it' }));
    await expect(recordQuizComplete('a@b.in', '8-12')).rejects.toThrow('Submit the quiz before completing it');
  });
});
