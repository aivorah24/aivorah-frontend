import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import LlmUsageScreen from '../../LlmUsageScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, []); },
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', accentRed: '#e33', accentCyan: '#5bf', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../services/llmStatsService', () => ({ fetchLlmStats: jest.fn() }));
import { fetchLlmStats } from '../../services/llmStatsService';

const STATS = {
  days: 7,
  summary: { totalCalls: 3, totalTokens: 430, totalCost: 0.006, avgResponseMs: 1000 },
  byModel: [{ model: 'gemini-2.5-flash', provider: 'google', calls: 2, tokens: 430, cost: 0.006 }],
  byDay: [], byProvider: [],
  feedback: { total: 1, avg: 3, counts: { 1: 0, 2: 0, 3: 1 }, recent: [] },
  recent: [],
};

const EMPTY_STATS = { days: 1, summary: { totalCalls: 0, totalTokens: 0, totalCost: 0, avgResponseMs: 0 }, byModel: [], byDay: [], byProvider: [], feedback: { total: 0, avg: null, counts: {}, recent: [] }, recent: [] };

describe('LlmUsageScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  test('renders summary KPIs and the by-model table', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => STATS);
    await render(<LlmUsageScreen navigation={{}} />);
    expect(await screen.findByText('3')).toBeTruthy(); // total calls
    expect(screen.getByText('gemini-2.5-flash')).toBeTruthy();
    expect(screen.getByTestId('llm-model-row-gemini-2.5-flash')).toBeTruthy();
  });

  test('switching the day-range tab reloads with the new window', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async (days: number) => ({ ...STATS, days }));
    const user = userEvent.setup();
    await render(<LlmUsageScreen navigation={{}} />);
    await screen.findByText('gemini-2.5-flash');
    await user.press(screen.getByTestId('llm-days-30'));
    await waitFor(() => expect(fetchLlmStats).toHaveBeenLastCalledWith(30));
  });

  test('a window with no AI calls shows the empty state, not a crash', async () => {
    (fetchLlmStats as jest.Mock).mockImplementation(async () => EMPTY_STATS);
    await render(<LlmUsageScreen navigation={{}} />);
    expect(await screen.findByText('No AI calls in this window.')).toBeTruthy();
    expect(screen.getByText('No feedback recorded in this window.')).toBeTruthy();
  });
});
