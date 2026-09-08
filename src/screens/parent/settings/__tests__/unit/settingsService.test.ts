import * as settingsService from '../../services/settingsService';
import SERVER_URL from '../../../../../config/serverUrl';
import AUTH_SERVER_URL from '../../../../../config/authServerUrl';

global.fetch = jest.fn();

describe('settingsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncProfile', () => {
    it('POSTs the patch to auth-service /user/sync', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });
      await settingsService.syncProfile({ email: 'p@test.com', name: 'New Name' });
      expect(fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/sync`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'p@test.com', name: 'New Name' }),
      }));
    });

    it('throws the server error when the request fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValueOnce({ error: 'boom' }) });
      await expect(settingsService.syncProfile({ email: 'p@test.com' })).rejects.toThrow('boom');
    });
  });

  describe('uploadPhoto', () => {
    it('POSTs to the monolith and returns the photo URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce({ photoUrl: 'https://x/y.jpg' }) });
      const url = await settingsService.uploadPhoto('p@test.com', 'base64data', 'image/jpeg');
      expect(fetch).toHaveBeenCalledWith(`${SERVER_URL}/user/upload-photo`, expect.any(Object));
      expect(url).toBe('https://x/y.jpg');
    });

    it('throws when no URL comes back', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce({ error: 'nope' }) });
      await expect(settingsService.uploadPhoto('p@test.com', 'x', 'image/jpeg')).rejects.toThrow('nope');
    });
  });

  describe('isEmailTaken', () => {
    it('returns true when auth-service /user/role responds ok', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      expect(await settingsService.isEmailTaken('taken@test.com')).toBe(true);
    });

    it('returns false when auth-service /user/role 404s', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      expect(await settingsService.isEmailTaken('free@test.com')).toBe(false);
    });
  });

  describe('sendEmailOtp', () => {
    it('POSTs to auth-service /user/email-otp/send', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });
      await settingsService.sendEmailOtp('new@test.com', 'Jane');
      expect(fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/email-otp/send`, expect.any(Object));
    });

    it('throws the server error on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValueOnce({ error: 'send failed' }) });
      await expect(settingsService.sendEmailOtp('new@test.com')).rejects.toThrow('send failed');
    });
  });

  describe('changeEmail', () => {
    it('POSTs to auth-service /user/change-email', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) });
      await settingsService.changeEmail('old@test.com', 'new@test.com', '123456');
      expect(fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/change-email`, expect.any(Object));
    });

    it('throws the server error on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValueOnce({ error: 'bad otp' }) });
      await expect(settingsService.changeEmail('old@test.com', 'new@test.com', '000000')).rejects.toThrow('bad otp');
    });
  });

  describe('changeEmailGoogle', () => {
    it('POSTs to auth-service /user/change-email-google and returns the payload', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ newEmail: 'new@gmail.com' }) });
      const res = await settingsService.changeEmailGoogle('old@gmail.com', 'token');
      expect(fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/change-email-google`, expect.any(Object));
      expect(res).toEqual({ newEmail: 'new@gmail.com' });
    });
  });

  describe('deleteAccount', () => {
    it('DELETEs to auth-service /user/delete-account', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await settingsService.deleteAccount('p@test.com');
      expect(fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/delete-account`, expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
