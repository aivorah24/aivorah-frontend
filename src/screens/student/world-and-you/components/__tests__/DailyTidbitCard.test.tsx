// Integration test for DailyTidbitCard — the real card and real
// useDailyTidbit hook, driven through a mocked global.fetch. The Current
// Affairs tab content (daily digest) is rendered by WorldAndYouScreen.

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import DailyTidbitCard from '../DailyTidbitCard';

jest.setTimeout(15000);

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', bgDark: '#000',
  }, isDark: true }),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('DailyTidbitCard — GK tab (default)', () => {
  test('loads and shows the real GK fact and category', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      gk: { fact: 'Octopuses have three hearts.', category: 'Animals' },
      currentAffairs: { headline: 'H', summary: 'S' },
    })) as any;

    await render(<DailyTidbitCard grade="Grade 4" />);

    await waitFor(() => expect(screen.getByText('Octopuses have three hearts.')).toBeTruthy());
    expect(screen.getByText('Animals')).toBeTruthy();
    expect(screen.getByText('Did You Know?')).toBeTruthy();
  });

  test('unwraps a GK fact that arrived as a stringified nested object', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      gk: { fact: JSON.stringify({ fact: 'The real fact.' }), category: 'Science' },
      currentAffairs: { headline: 'H', summary: 'S' },
    })) as any;

    await render(<DailyTidbitCard grade="Grade 4" />);

    await waitFor(() => expect(screen.getByText('The real fact.')).toBeTruthy());
  });

  test('a load failure shows the real "Couldn\'t load" retry message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<DailyTidbitCard grade="Grade 4" />);
    await waitFor(() => expect(screen.getByText("Couldn't load. Tap refresh to try again.")).toBeTruthy());
  });
});

const TIDBIT = {
  gk: { fact: 'A fact', category: 'Science' },
  currentAffairs: { headline: 'Old single headline', summary: 'Old summary' },
};

describe('DailyTidbitCard — Current Affairs tab', () => {
  test('switching to Current Affairs reports the tab and no longer shows the old single headline', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(TIDBIT)) as any;
    const onTabChange = jest.fn();
    const user = userEvent.setup();

    await render(<DailyTidbitCard grade="Grade 4" onTabChange={onTabChange} />);
    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());

    await user.press(screen.getByText('Current Affairs'));

    expect(onTabChange).toHaveBeenCalledWith('news');
    expect(screen.getByText('Today in the World')).toBeTruthy();
    expect(screen.queryByText('A fact')).toBeNull();
    expect(screen.queryByText('Old single headline')).toBeNull();
    expect(screen.queryByText('Test Your Knowledge')).toBeNull();
  });

  test('pressing "GK Fact" switches back', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(TIDBIT)) as any;
    const user = userEvent.setup();

    await render(<DailyTidbitCard grade="Grade 4" />);
    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());
    await user.press(screen.getByText('Current Affairs'));
    await user.press(screen.getByText('GK Fact'));

    expect(screen.getByText('A fact')).toBeTruthy();
    expect(screen.getByText('Did You Know?')).toBeTruthy();
  });

  test('controlled by the parent: shows the tab it is given and asks the parent to change it', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(TIDBIT)) as any;
    const onTabChange = jest.fn();
    const user = userEvent.setup();

    await render(<DailyTidbitCard grade="Grade 4" tab="news" onTabChange={onTabChange} />);
    expect(screen.getByText('Today in the World')).toBeTruthy();

    await user.press(screen.getByText('GK Fact'));
    expect(onTabChange).toHaveBeenCalledWith('gk');
    // Still on news until the parent changes the prop.
    expect(screen.getByText('Today in the World')).toBeTruthy();
  });
});
