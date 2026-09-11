jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { email: 'student@test.ai', role: 'student' } }),
}));

import { resolveStudentId } from '../StudentDataContext';

// Bug: a device with a stale cached studentId (e.g. from before the account
// was deleted and recreated with a new id via Settings > Delete Account,
// then signing back in) kept using the dead id forever, since the old
// cached-first order never re-contacted the server as long as SOME
// UUID-shaped value existed. Every assignment/challenge/stats request then
// silently "succeeded" against an id nothing was actually attached to, so a
// teacher's real assignments never appeared for the student. The server
// must always be source of truth; the cache is an offline fallback only.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');

describe('resolveStudentId', () => {
  beforeEach(() => {
    AsyncStorage.getItem.mockReset();
    AsyncStorage.setItem.mockClear();
    global.fetch = jest.fn();
  });

  test('a real stale cached id is overridden by the server current id, and the cache is updated to match', async () => {
    AsyncStorage.getItem.mockResolvedValue('8391cbe8-0000-4000-8000-000000000000'); // stale, dead id
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '0ea7f61a-bf1b-435b-a0f4-1f507360a1de' }), // real current id
    });

    const id = await resolveStudentId('saibrintha02@gmail.com');

    expect(id).toBe('0ea7f61a-bf1b-435b-a0f4-1f507360a1de');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@student_id_saibrintha02@gmail.com',
      '0ea7f61a-bf1b-435b-a0f4-1f507360a1de'
    );
  });

  test('a real network failure falls back to the last known-good cached id', async () => {
    AsyncStorage.getItem.mockResolvedValue('0ea7f61a-bf1b-435b-a0f4-1f507360a1de');
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    const id = await resolveStudentId('saibrintha02@gmail.com');

    expect(id).toBe('0ea7f61a-bf1b-435b-a0f4-1f507360a1de');
  });

  test('a real network failure with no cache at all falls back to a stable offline id', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));

    const id = await resolveStudentId('newstudent@test.ai');

    expect(id).toMatch(/^00000000-0000-0000-0000-\d{12}$/);
  });

  test('a real successful sync is used even when no cache existed yet', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'aaaa1111-0000-4000-8000-000000000000' }),
    });

    const id = await resolveStudentId('brandnew@test.ai');

    expect(id).toBe('aaaa1111-0000-4000-8000-000000000000');
  });

  test('a known demo email bypasses the server entirely', async () => {
    const id = await resolveStudentId('alex@demo.com');
    expect(id).toBe('00000000-0000-0000-0000-000000000001');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
