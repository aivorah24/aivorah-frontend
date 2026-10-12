import React from 'react';
import { render, screen, waitFor, userEvent, fireEvent, within } from '@testing-library/react-native';
import LlmUsageScreen from '../../LlmUsageScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, []); },
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, colors: { primary: '#5E7566', accentGreen: '#5E7566', accentYellow: '#c90', accentRed: '#e33', accentCyan: '#5bf', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: any) => children ?? null }));
jest.mock('../../services/llmStatsService', () => ({ fetchLlmStats: jest.fn(), fetchLlmInsights: jest.fn() }));
import { fetchLlmStats, fetchLlmInsights } from '../../services/llmStatsService';

const DAYS = ['2026-10-04', '2026-10-05', '2026-10-06'];
const STATS = {
  days: 30,
  range: { from: '2026-09-11', to: '2026-10-10' },
  summary: { totalCalls: 19, totalTokens: 41000, totalCost: 0.0123, avgResponseMs: 1500, activeModels: 2 },
  previous: { totalCalls: 10, totalTokens: 20500, totalCost: 0.006, avgResponseMs: 1800 },
  lastCallAt: '2026-10-06T10:16:30Z',
  byDay: DAYS.map((date, i) => ({ date, calls: [0, 3, 16][i], tokens: [0, 6000, 35000][i], cost: [0, 0.002, 0.0103][i], avgResponseMs: [0, 1700, 1450][i] })),
  byModel: [
    { model: 'openai/gpt-oss-120b', provider: 'groq', calls: 17, tokens: 38000, cost: 0.011, avgResponseMs: 1400, costShare: 0.89, callShare: 0.89, trend: [0, 5000, 33000], rated: 4, helpful: 3, helpfulPct: 75 },
    { model: 'llama-3.3-70b-versatile', provider: 'groq', calls: 2, tokens: 3000, cost: 0.0013, avgResponseMs: 2300, costShare: 0.11, callShare: 0.11, trend: [0, 1000, 2000], rated: 0, helpful: 0, helpfulPct: null },
  ],
  byFeature: [{ feature: 'AI Coach', calls: 19, tokens: 41000 }],
  byProvider: [{ provider: 'groq', calls: 19 }],
  feedback: { total: 1, avg: 3, counts: { 1: 0, 2: 0, 3: 1 }, recent: [] },
  recent: [{ created_at: '2026-10-06T10:16:30Z', model: 'openai/gpt-oss-120b', provider: 'groq', route: '/ask/stream', feature: 'AI Coach', total_tokens: 2100, cost: 0.0009, response_time_ms: 1300, feedback: 3 }],
};

const EMPTY_STATS = {
  ...STATS, days: 1, range: { from: '2026-10-10', to: '2026-10-10' },
  summary: { totalCalls: 0, totalTokens: 0, totalCost: 0, avgResponseMs: 0, activeModels: 0 },
  previous: { totalCalls: 0, totalTokens: 0, totalCost: 0, avgResponseMs: 0 },
  byDay: [{ date: '2026-10-10', calls: 0, tokens: 0, cost: 0 }], byModel: [], byFeature: [], byProvider: [],
  feedback: { total: 0, avg: null, counts: {}, recent: [] }, recent: [],
};

describe('LlmUsageScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchLlmInsights as jest.Mock).mockResolvedValue({ text: 'Rule text', source: 'summary', model: null, generatedAt: '', cached: false });
  });

  test('insights banner shows the AI paragraph with an AI-GENERATED tag', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => STATS);
    (fetchLlmInsights as jest.Mock).mockResolvedValue({ text: 'GPT-OSS drives 89% of spend.', source: 'ai', model: 'gemini-test', generatedAt: '', cached: false });
    await render(<LlmUsageScreen navigation={{}} />);
    const banner = within(await screen.findByTestId('llm-insight'));
    expect(await banner.findByText('GPT-OSS drives 89% of spend.')).toBeTruthy();
    expect(banner.getByTestId('llm-insight-tag').props.children).toBe('AI-GENERATED');
    expect(fetchLlmInsights).toHaveBeenCalledWith(30);
  });

  test('insights banner silently keeps the local summary when the insights call fails', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => STATS);
    (fetchLlmInsights as jest.Mock).mockRejectedValue(new Error('down'));
    await render(<LlmUsageScreen navigation={{}} />);
    const banner = within(await screen.findByTestId('llm-insight'));
    await waitFor(() => expect(banner.queryByTestId('llm-insight-loading')).toBeNull());
    expect(banner.getByText(/AI Coach made 100% of 19 calls/)).toBeTruthy();
    expect(banner.getByTestId('llm-insight-tag').props.children).toBe('SUMMARY');
    expect(screen.queryByText('down')).toBeNull();
  });

  test('KPI tiles show totals with the change vs the previous window, plus models table, legend and recent activity', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => STATS);
    await render(<LlmUsageScreen navigation={{}} />);

    const tokens = within(await screen.findByTestId('llm-kpi-tokens'));
    expect(tokens.getByText('41K')).toBeTruthy();
    expect(tokens.getByText(/\+100%/)).toBeTruthy();
    expect(within(screen.getByTestId('llm-kpi-cost')).getByText('$0.012')).toBeTruthy();
    expect(within(screen.getByTestId('llm-kpi-speed')).getByText('1.5s')).toBeTruthy();

    expect(screen.getByTestId('llm-model-row-openai/gpt-oss-120b')).toBeTruthy();
    expect(screen.getByTestId('llm-legend-llama-3.3-70b-versatile')).toBeTruthy();
    expect(within(screen.getByTestId('llm-recent-0')).getByText('AI Coach')).toBeTruthy();
    expect(within(screen.getByTestId('llm-insight')).getByText(/AI Coach made 100% of 19 calls; tokens up 100% vs the previous 30 days/)).toBeTruthy();
  });

  test('quality & speed shows per-model response time and helpful share, or that there are no ratings yet', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => STATS);
    await render(<LlmUsageScreen navigation={{}} />);
    expect(within(await screen.findByTestId('llm-quality-openai/gpt-oss-120b')).getByText('1.4s · 75% helpful')).toBeTruthy();
    expect(within(screen.getByTestId('llm-quality-llama-3.3-70b-versatile')).getByText('2.3s · no ratings yet')).toBeTruthy();
  });

  test('hovering a day on the spend chart shows that day and its value', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => STATS);
    await render(<LlmUsageScreen navigation={{}} />);
    const area = await screen.findByTestId('llm-area');
    fireEvent(area, 'layout', { nativeEvent: { layout: { width: 600, height: 220 } } });
    fireEvent(await screen.findByTestId('llm-area-hit-2'), 'pressIn');
    expect(screen.getAllByText('Oct 6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$0.010').length).toBeGreaterThan(0);
  });

  test('switching the window reloads with the new range', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async (days: number) => ({ ...STATS, days }));
    const user = userEvent.setup();
    await render(<LlmUsageScreen navigation={{}} />);
    await screen.findByTestId('llm-kpi-tokens');
    expect(fetchLlmStats).toHaveBeenCalledWith(30);
    await user.press(screen.getByTestId('llm-days-90'));
    await waitFor(() => expect(fetchLlmStats).toHaveBeenLastCalledWith(90));
  });

  test('a window with no AI calls says when the last call was, instead of empty charts', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => EMPTY_STATS);
    await render(<LlmUsageScreen navigation={{}} />);
    expect(await screen.findByText('No AI calls in this window.')).toBeTruthy();
    expect(screen.getByText(/the most recent was Oct 6/)).toBeTruthy();
    expect(screen.queryByTestId('llm-area')).toBeNull();
  });
});
