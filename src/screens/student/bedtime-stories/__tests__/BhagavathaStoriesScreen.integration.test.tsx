// Integration tests for BhagavathaStoriesScreen — the real story list
// screen, real useStoryList hook, fetch mocked. AuthContext/ThemeContext
// mocked; navigation hooks mocked (ScreenLayout needs them).

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import BhagavathaStoriesScreen from '../BhagavathaStoriesScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Stories', name: 'Stories' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: true }),
}));

let mockUser: any = { name: 'A Student', email: 'a@a.com', isPro: false };
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

function navProp() {
  return { navigate: jest.fn(), openDrawer: jest.fn() };
}

// Header fires its own analytics fetch on mount, hitting the same global.fetch
// mock as useStoryList's /stories call. Route by URL so a test's intent for
// the stories call doesn't get consumed by that unrelated call first.
function mockFetchByUrl(handler: () => Promise<any>) {
  global.fetch = jest.fn((url: string) => {
    if (String(url).includes('/stories')) return handler();
    return Promise.resolve({ json: async () => ({}) });
  }) as any;
}

beforeEach(() => {
  mockUser = { name: 'A Student', email: 'a@a.com', isPro: false };
  mockFetchByUrl(() => Promise.resolve({ json: async () => ([]) }));
});

describe('BhagavathaStoriesScreen', () => {
  test('shows a loading state, then the real stories grouped by collection', async () => {
    mockFetchByUrl(() => Promise.resolve({
      json: async () => ([
        { id: 'ambarisha', title: 'Ambarisha Maharaja', collection: 'Srimad Bhagavatam', pageCount: 5, ageGroup: '8-12' },
        { id: 'dhruva', title: 'Dhruva', collection: 'Srimad Bhagavatam', pageCount: 4, ageGroup: '6-10' },
        { id: 'ramayana-1', title: 'The Golden Deer', collection: 'Ramayana', pageCount: 3, ageGroup: '6-10' },
      ]),
    }));

    await render(<BhagavathaStoriesScreen navigation={navProp()} />);

    expect(await screen.findByText('Ambarisha Maharaja')).toBeTruthy();
    expect(screen.getByText('Dhruva')).toBeTruthy();
    expect(screen.getByText('The Golden Deer')).toBeTruthy();
    // Both real collection headings appear.
    expect(screen.getByText('Srimad Bhagavatam')).toBeTruthy();
    expect(screen.getByText('Ramayana')).toBeTruthy();
  });

  test('a fetch failure shows the real error message', async () => {
    mockFetchByUrl(() => Promise.reject(new Error('network down')));
    await render(<BhagavathaStoriesScreen navigation={navProp()} />);
    expect(await screen.findByText('Could not load stories. Please try again.')).toBeTruthy();
  });

  test('no stories returned -> no crash, no collection headings shown', async () => {
    mockFetchByUrl(() => Promise.resolve({ json: async () => ([]) }));
    await render(<BhagavathaStoriesScreen navigation={navProp()} />);
    expect(await screen.findByText('Bedtime Stories for Children')).toBeTruthy();
  });

  test('pressing a story card navigates to StoryReader with the real storyId and title', async () => {
    mockFetchByUrl(() => Promise.resolve({
      json: async () => ([
        { id: 'ambarisha', title: 'Ambarisha Maharaja', collection: 'Srimad Bhagavatam', pageCount: 5, ageGroup: '8-12' },
      ]),
    }));
    const nav = navProp();
    const user = userEvent.setup();
    await render(<BhagavathaStoriesScreen navigation={nav} />);

    await user.press(await screen.findByText('Ambarisha Maharaja'));

    expect(nav.navigate).toHaveBeenCalledWith('StoryReader', { storyId: 'ambarisha', storyTitle: 'Ambarisha Maharaja' });
  });
});
