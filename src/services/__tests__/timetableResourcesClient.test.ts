import { trRequest, trUpload } from '../timetableResourcesClient';
import TIMETABLE_RESOURCES_SERVER_URL from '../../config/timetableResourcesServerUrl';

let mockUser: { getIdToken: () => Promise<string> } | null = { getIdToken: async () => 'tok-1' };
const mockReady = jest.fn(async () => {});
jest.mock('../../config/firebase', () => ({
  auth: { get currentUser() { return mockUser; }, authStateReady: () => mockReady() },
}));

const ok = (body: unknown) => ({ ok: true, json: async () => body });

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { getIdToken: async () => 'tok-1' };
  global.fetch = jest.fn().mockResolvedValue(ok({ a: 1 })) as any;
});

test('GET sends the sign-in token and no body', async () => {
  await expect(trRequest('/resources')).resolves.toEqual({ a: 1 });
  expect(mockReady).toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledWith(`${TIMETABLE_RESOURCES_SERVER_URL}/resources`, {
    method: 'GET', headers: { Authorization: 'Bearer tok-1' }, body: undefined,
  });
});

test('a body is sent as JSON', async () => {
  await trRequest('/timetable/slot', { method: 'PUT', body: { day: 'MON' } });
  const init = (global.fetch as jest.Mock).mock.calls[0][1];
  expect(init.headers).toEqual({ Authorization: 'Bearer tok-1', 'Content-Type': 'application/json' });
  expect(init.body).toBe('{"day":"MON"}');
});

test('not signed in: no request is made', async () => {
  mockUser = null;
  await expect(trRequest('/resources')).rejects.toThrow('Not signed in.');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a server error message is passed on, else the fallback', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Sign in required' }) });
  await expect(trRequest('/resources', {}, 'Failed')).rejects.toThrow('Sign in required');
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('bad json'); } });
  await expect(trRequest('/resources', {}, 'Failed')).rejects.toThrow('Failed');
});

test('upload posts the file with the token', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(ok({ url: 'https://cdn/x.pdf', name: 'x.pdf', size: 3, type: 'pdf' }));
  const res = await trUpload(new Blob(['abc']), 'x.pdf');
  expect(res.url).toBe('https://cdn/x.pdf');
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe(`${TIMETABLE_RESOURCES_SERVER_URL}/uploads`);
  expect(init.headers).toEqual({ Authorization: 'Bearer tok-1' });
  expect(init.body).toBeInstanceOf(FormData);
});
