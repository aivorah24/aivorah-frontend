import * as helpCenterService from '../../services/helpCenterService';
import HELP_SERVICE_URL from '../../../../../config/helpServiceUrl';

global.fetch = jest.fn();

describe('helpCenterService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendChatMessage', () => {
    it('POSTs to the help-center chat endpoint and returns the reply', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({ reply: 'Hi there!' }) });
      const reply = await helpCenterService.sendChatMessage('How do I check progress?', 'Anaya');
      expect(fetch).toHaveBeenCalledWith(`${HELP_SERVICE_URL}/help/chat`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'How do I check progress?', userName: 'Anaya' }),
      }));
      expect(reply).toBe('Hi there!');
    });

    it('falls back to a generic message when the reply is missing', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValue({}) });
      const reply = await helpCenterService.sendChatMessage('hello', 'Anaya');
      expect(reply).toBe('Something went wrong.');
    });
  });

  describe('submitTicket', () => {
    it('POSTs to the ticket endpoint and resolves on success', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({ success: true }) });
      await expect(helpCenterService.submitTicket('p@test.com', 'Subject', 'Message')).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(`${HELP_SERVICE_URL}/help/ticket`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'p@test.com', subject: 'Subject', message: 'Message' }),
      }));
    });

    it('throws the server-provided error when the request fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValue({ error: 'Email service not configured.' }) });
      await expect(helpCenterService.submitTicket('p@test.com', 'Subject', 'Message'))
        .rejects.toThrow('Email service not configured.');
    });

    it('throws a generic error when the response body cannot be parsed', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockRejectedValue(new Error('bad json')) });
      await expect(helpCenterService.submitTicket('p@test.com', 'Subject', 'Message'))
        .rejects.toThrow('Could not submit ticket.');
    });
  });
});
