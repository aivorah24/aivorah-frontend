// Integration test for WorldAndYouScreen — the real screen, real
// DailyTidbitCard/OnThisDayCard/BrainTeaserCard, the real Current Affairs tab
// (useDigest + DigestContent + currentAffairsApi), driven entirely through a
// mocked global.fetch routed by URL path.

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import WorldAndYouScreen from '../WorldAndYouScreen';
import { clearScreenCache } from '../../../../utils/screenCache';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ key: 'WorldAndYou', name: 'WorldAndYou' }),
    useFocusEffect: (effect: () => void) => ReactActual.useEffect(effect, [effect]),
  };
});

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

const DIGEST = {
  date: '2026-11-09', isToday: true, ageGroup: '8-12', target: 10, readCount: 0, completed: false,
  stories: [{
    id: 's1', category: 'india', publishDate: '2026-11-09', title: 'India and Space Exploration: Chandrayaan-3',
    summary: 'India landed near the Moon’s south pole.', whatHappened: 'W', whyImportant: 'Y', didYouKnow: null,
    newWords: [], thinkAboutIt: null, imageUrl: null, source: 'ISRO', sourceUrl: null, readTimeSeconds: 60, read: false,
  }],
};

function mockFetchRoutes({ tidbit, world, tidbitOk = true, worldOk = true, digest = DIGEST }: any) {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/daily-tidbit')) return jsonRes(tidbit, tidbitOk);
    if (url.includes('/world/daily')) return jsonRes(world, worldOk);
    if (url.includes('/current-affairs/digest/today')) return jsonRes(digest);
    if (url.includes('/current-affairs/progress/')) return jsonRes({ progress: { points: 15, currentStreak: 2, badges: {} } });
    return jsonRes({});
  }) as any;
}

function navProp() {
  return { openDrawer: jest.fn(), navigate: jest.fn() };
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
    await waitFor(() => expect(screen.getByText('India and Space Exploration: Chandrayaan-3')).toBeTruthy());
    expect(screen.queryByText('Real headline')).toBeNull(); // the old single headline is gone
    expect(screen.queryByText('Moon landing.')).toBeNull();
    expect(screen.queryByText('Why is the sky blue?')).toBeNull();

    await user.press(screen.getByText('GK Fact'));
    await waitFor(() => expect(screen.getByText('Moon landing.')).toBeTruthy());
    expect(screen.getByText('Why is the sky blue?')).toBeTruthy();
  });

  test('the Current Affairs tab shows today’s digest, the student’s points and the weekly quiz', async () => {
    mockFetchRoutes({
      tidbit: { gk: { fact: 'A fact', category: 'Science' }, currentAffairs: { headline: 'H', summary: 'S' } },
      world: { date: 'August 18', onThisDay: [], funChallenge: { question: 'Q?', answer: 'A' } },
    });
    const navigation = navProp();
    const user = userEvent.setup();

    await render(<WorldAndYouScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());
    // Nothing is fetched for Current Affairs until the tab is opened.
    expect((global.fetch as jest.Mock).mock.calls.some(([u]) => String(u).includes('/current-affairs/'))).toBe(false);

    await user.press(screen.getByText('Current Affairs'));
    expect(await screen.findByText('India and Space Exploration: Chandrayaan-3')).toBeTruthy();
    expect(screen.getByLabelText('15 Points')).toBeTruthy();
    expect(screen.getByText('0 of 1 story read')).toBeTruthy();
    expect(screen.getByText('Weekly Quiz')).toBeTruthy();

    await user.press(screen.getByText('India and Space Exploration: Chandrayaan-3'));
    expect(navigation.navigate).toHaveBeenCalledWith('CurrentAffairsStory', { storyId: 's1', ageGroup: '8-12' });
    await user.press(screen.getByText('Weekly Quiz'));
    expect(navigation.navigate).toHaveBeenCalledWith('CurrentAffairsQuiz', { ageGroup: '8-12' });
  });

  test('opening with { tab: "news" } (Back from a story or the quiz) lands on Current Affairs', async () => {
    mockFetchRoutes({
      tidbit: { gk: { fact: 'A fact', category: 'Science' }, currentAffairs: { headline: 'H', summary: 'S' } },
      world: { date: 'August 18', onThisDay: [{ year: 1969, fact: 'Moon landing.' }], funChallenge: { question: 'Q?', answer: 'A' } },
    });

    await render(<WorldAndYouScreen navigation={navProp()} route={{ params: { tab: 'news' } }} />);

    expect(await screen.findByText('India and Space Exploration: Chandrayaan-3')).toBeTruthy();
    expect(screen.queryByText('Moon landing.')).toBeNull();
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

// Screens show their last data instantly from this cache; start every test empty.
beforeEach(() => clearScreenCache());
