import { fetchLlmStats, fetchLlmInsights } from '../llmStatsService';
import SERVER_URL from '../../../../../config/platformAdminServerUrl';

jest.mock('../../../../../services/authHeader', () => ({
  authHeader: jest.fn(async () => ({ Authorization: 'Bearer tok' })),
}));

beforeEach(() => { global.fetch = jest.fn(); });

describe('fetchLlmStats', () => {
  it('calls /llm-stats with the days param and auth header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ days: 7, summary: {} }) });
    const result = await fetchLlmStats(7);
    expect(result).toEqual({ days: 7, summary: {} });
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/llm-stats?days=7`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('throws the server-provided error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unauthorized' }) });
    await expect(fetchLlmStats(7)).rejects.toThrow('Unauthorized');
  });
});

describe('fetchLlmInsights', () => {
  it('calls /llm-stats/insights with the days param and auth header', async () => {
    const body = { text: 'x', source: 'ai', model: 'm', generatedAt: '', cached: false };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => body });
    expect(await fetchLlmInsights(90)).toEqual(body);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/llm-stats/insights?days=90`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('throws on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(fetchLlmInsights(7)).rejects.toThrow('Failed to load LLM insights');
  });
});
