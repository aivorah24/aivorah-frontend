import * as api from '../../services/accountApi';
import AUTH_SERVER_URL from '../../../../../config/authServerUrl';

const ok = (body: unknown = {}) => ({ ok: true, json: async () => body });
const fail = (error?: string) => ({ ok: false, json: async () => (error ? { error } : {}) });

beforeEach(() => { global.fetch = jest.fn().mockResolvedValue(ok()) as any; });

test('isEmailTaken: ok -> true, 404 -> false', async () => {
  await expect(api.isEmailTaken('a@b.co')).resolves.toBe(true);
  expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/role?email=a%40b.co`);
  (global.fetch as jest.Mock).mockResolvedValueOnce(fail());
  await expect(api.isEmailTaken('a@b.co')).resolves.toBe(false);
});

test.each([
  ['sendEmailOtp', () => api.sendEmailOtp('n@b.co', 'Asha'), '/user/email-otp/send', { email: 'n@b.co', name: 'Asha' }, 'Could not send the verification code.'],
  ['changeEmail', () => api.changeEmail('o@b.co', 'n@b.co', '123456'), '/user/change-email', { currentEmail: 'o@b.co', newEmail: 'n@b.co', otp: '123456' }, 'Could not update your email.'],
  ['changeEmailGoogle', () => api.changeEmailGoogle('o@b.co', 'tok'), '/user/change-email-google', { currentEmail: 'o@b.co', idToken: 'tok' }, 'Could not switch your Google account.'],
])('%s posts to the auth service and passes on errors', async (_n, call, path, body, fallback) => {
  await call();
  expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}${path}`, expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }));
  (global.fetch as jest.Mock).mockResolvedValueOnce(fail('Server says no'));
  await expect(call()).rejects.toThrow('Server says no');
  (global.fetch as jest.Mock).mockResolvedValueOnce(fail());
  await expect(call()).rejects.toThrow(fallback);
});

test('changeEmailGoogle returns the new email', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce(ok({ newEmail: 'n@b.co' }));
  await expect(api.changeEmailGoogle('o@b.co', 'tok')).resolves.toEqual({ newEmail: 'n@b.co' });
});
