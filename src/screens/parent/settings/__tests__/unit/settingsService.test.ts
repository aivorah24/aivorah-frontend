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

  describe('deleteAccount', () => {
    it('DELETEs to auth-service /user/delete-account', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await settingsService.deleteAccount('p@test.com');
      expect(fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/delete-account`, expect.objectContaining({ method: 'DELETE' }));
    });
  });
});
