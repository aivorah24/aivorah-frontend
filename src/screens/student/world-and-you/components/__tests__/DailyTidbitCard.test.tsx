// Integration test for DailyTidbitCard — the real card, real hooks
// (useDailyTidbit, useTidbitQuiz), and real QuizSection, driven entirely
// through a mocked global.fetch (no module-boundary mocks for the hooks).

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

    await render(<DailyTidbitCard grade="Grade 4" studentId="s1" />);

    await waitFor(() => expect(screen.getByText('Octopuses have three hearts.')).toBeTruthy());
    expect(screen.getByText('Animals')).toBeTruthy();
    expect(screen.getByText('Did You Know?')).toBeTruthy();
  });

  test('unwraps a GK fact that arrived as a stringified nested object', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      gk: { fact: JSON.stringify({ fact: 'The real fact.' }), category: 'Science' },
      currentAffairs: { headline: 'H', summary: 'S' },
    })) as any;

    await render(<DailyTidbitCard grade="Grade 4" studentId="s1" />);

    await waitFor(() => expect(screen.getByText('The real fact.')).toBeTruthy());
  });

  test('a load failure shows the real "Couldn\'t load" retry message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<DailyTidbitCard grade="Grade 4" studentId="s1" />);
    await waitFor(() => expect(screen.getByText("Couldn't load. Tap refresh to try again.")).toBeTruthy());
  });
});

describe('DailyTidbitCard — Current Affairs tab', () => {
  test('switching tabs shows the real headline and summary', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      gk: { fact: 'A fact', category: 'Science' },
      currentAffairs: { headline: 'Robot Helps in Surgery', summary: 'A robot assisted doctors today.' },
    })) as any;
    const user = userEvent.setup();

    await render(<DailyTidbitCard grade="Grade 4" studentId="s1" />);
    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());

    await user.press(screen.getByText('Current Affairs'));

    expect(screen.getByText('Robot Helps in Surgery')).toBeTruthy();
    expect(screen.getByText('A robot assisted doctors today.')).toBeTruthy();
  });

  test('pressing the real "GK Fact" tab switches back from Current Affairs', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      gk: { fact: 'A fact', category: 'Science' },
      currentAffairs: { headline: 'Robot Helps in Surgery', summary: 'A robot assisted doctors today.' },
    })) as any;
    const user = userEvent.setup();

    await render(<DailyTidbitCard grade="Grade 4" studentId="s1" />);
    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());
    await user.press(screen.getByText('Current Affairs'));
    await waitFor(() => expect(screen.getByText('Robot Helps in Surgery')).toBeTruthy());

    await user.press(screen.getByText('GK Fact'));

    expect(screen.getByText('A fact')).toBeTruthy();
    expect(screen.queryByText('Robot Helps in Surgery')).toBeNull();
  });

  test('the real "Test Your Knowledge" quiz button starts a real comprehension quiz', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/daily-tidbit/quiz')) return jsonRes({ questions: [{ question: 'What happened?', options: ['A', 'B'], correct: 0 }] });
      return jsonRes({
        gk: { fact: 'A fact', category: 'Science' },
        currentAffairs: { headline: 'Robot Helps in Surgery', summary: 'A robot assisted doctors today.' },
      });
    }) as any;
    const user = userEvent.setup();

    await render(<DailyTidbitCard grade="Grade 4" studentId="s1" />);
    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());
    await user.press(screen.getByText('Current Affairs'));

    await user.press(screen.getByText('Test Your Knowledge'));

    await waitFor(() => expect(screen.getByText('What happened?')).toBeTruthy());
  });

  test('answering the real quiz inside the card calls through to useTidbitQuiz.handleAnswer and reaches a result', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/daily-tidbit/quiz-complete')) return jsonRes({ xpAwarded: 10 });
      if (url.includes('/daily-tidbit/quiz')) return jsonRes({ questions: [{ question: 'What happened?', options: ['Yes it did', 'No it did not'], correct: 0 }] });
      return jsonRes({
        gk: { fact: 'A fact', category: 'Science' },
        currentAffairs: { headline: 'Robot Helps in Surgery', summary: 'A robot assisted doctors today.' },
      });
    }) as any;
    const user = userEvent.setup();

    await render(<DailyTidbitCard grade="Grade 4" studentId="s1" />);
    await waitFor(() => expect(screen.getByText('A fact')).toBeTruthy());
    await user.press(screen.getByText('Current Affairs'));
    await user.press(screen.getByText('Test Your Knowledge'));
    await waitFor(() => expect(screen.getByText('What happened?')).toBeTruthy());

    await user.press(screen.getByText('Yes it did'));

    await waitFor(() => expect(screen.getByText('Perfect score!')).toBeTruthy(), { timeout: 2000 });
    expect(screen.getByText('+10 XP earned')).toBeTruthy();
  });
});

