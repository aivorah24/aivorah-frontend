// Integration test for WorldAndYouScreen — the real screen, real
// DailyTidbitCard/OnThisDayCard/BrainTeaserCard, and real hooks
// (useWorldData, useDailyTidbit, useTidbitQuiz), driven entirely through a
// mocked global.fetch routed by URL path.

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import WorldAndYouScreen from '../WorldAndYouScreen';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'WorldAndYou', name: 'WorldAndYou' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', textDim: '#666',
  }, isDark: true }),
}));

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'A Student', email: 'a@a.com', grade: 'Grade 4' } }),
}));

jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ studentId: 's1' }),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function mockFetchRoutes({ tidbit, world, tidbitOk = true, worldOk = true }: any) {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/daily-tidbit')) return jsonRes(tidbit, tidbitOk);
    if (url.includes('/world/daily')) return jsonRes(world, worldOk);
    return jsonRes({});
  }) as any;
}

function navProp() {
  return { openDrawer: jest.fn() };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('WorldAndYouScreen — loaded state', () => {
  test('shows the real GK fact, On This Day items, and brain teaser question', async () => {
    mockFetchRoutes({
      tidbit: { gk: { fact: 'Octopuses have three hearts.', category: 'Animals' }, currentAffairs: { headline: 'H', summary: 'S' } },
      world: {
        date: 'August 18', grade: 'Grade 4',
        onThisDay: [{ year: 1969, fact: 'Moon landing.' }],
        gkFact: { fact: 'Ignored', category: 'Science' },
        funChallenge: { question: 'Why is the sky blue?', answer: 'Light scattering.' },
      },
    });

    await render(<WorldAndYouScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Octopuses have three hearts.')).toBeTruthy());
    expect(screen.getByText('Moon landing.')).toBeTruthy();
    expect(screen.getByText('Why is the sky blue?')).toBeTruthy();
    expect(screen.getByText('August 18')).toBeTruthy();
    expect(screen.getByText('Grade 4')).toBeTruthy();
  });

  test('revealing the brain teaser answer shows the real answer text', async () => {
    mockFetchRoutes({
      tidbit: { gk: { fact: 'A fact', category: 'Science' }, currentAffairs: { headline: 'H', summary: 'S' } },
      world: {
        date: 'August 18', onThisDay: [],
        funChallenge: { question: 'Why is the sky blue?', answer: 'Light scattering.' },
      },
    });
    const user = userEvent.setup();

    await render(<WorldAndYouScreen navigation={navProp()} />);
    await waitFor(() => expect(screen.getByText('Why is the sky blue?')).toBeTruthy());

    await user.press(screen.getByText('Reveal Answer'));

    expect(screen.getByText('Light scattering.')).toBeTruthy();
  });

  // Regression test: On This Day / Brain Teaser are trivia/GK content, not
  // Current Affairs (real news) — they used to show unconditionally
  // regardless of which DailyTidbitCard tab was active, which read as GK
  // content bleeding into the Current Affairs tab.
  test('switching to the Current Affairs tab hides On This Day and Brain Teaser; switching back shows them again', async () => {
    mockFetchRoutes({
      tidbit: { gk: { fact: 'Octopuses have three hearts.', category: 'Animals' }, currentAffairs: { headline: 'Real headline', summary: 'Real summary' } },
      world: {
        date: 'August 18',
        onThisDay: [{ year: 1969, fact: 'Moon landing.' }],
        funChallenge: { question: 'Why is the sky blue?', answer: 'Light scattering.' },
      },
    });
    const user = userEvent.setup();

    await render(<WorldAndYouScreen navigation={navProp()} />);
    await waitFor(() => expect(screen.getByText('Moon landing.')).toBeTruthy());
    expect(screen.getByText('Why is the sky blue?')).toBeTruthy();

    await user.press(screen.getByText('Current Affairs'));
    await waitFor(() => expect(screen.getByText('Real headline')).toBeTruthy());
    expect(screen.queryByText('Moon landing.')).toBeNull();
    expect(screen.queryByText('Why is the sky blue?')).toBeNull();

    await user.press(screen.getByText('GK Fact'));
    await waitFor(() => expect(screen.getByText('Moon landing.')).toBeTruthy());
    expect(screen.getByText('Why is the sky blue?')).toBeTruthy();
  });

  test('an empty onThisDay array hides the OnThisDayCard entirely', async () => {
    mockFetchRoutes({
      tidbit: { gk: { fact: 'A fact', category: 'Science' }, currentAffairs: { headline: 'H', summary: 'S' } },
      world: { date: 'August 18', onThisDay: [], funChallenge: { question: 'Q?', answer: 'A' } },
    });

    await render(<WorldAndYouScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());
    expect(screen.queryByText('On This Day')).toBeNull();
  });
});

describe('WorldAndYouScreen — error state', () => {
  test('a world/daily failure shows the real error hint instead of the history/teaser cards', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/daily-tidbit')) return jsonRes({ gk: { fact: 'A fact', category: 'Science' }, currentAffairs: { headline: 'H', summary: 'S' } });
      if (url.includes('/world/daily')) return Promise.reject(new Error('down'));
      return jsonRes({});
    }) as any;

    await render(<WorldAndYouScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText("Could not load today's content. Please try again.")).toBeTruthy());
    expect(screen.queryByText('On This Day')).toBeNull();
  });
});
