import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../AppNavigator';

const mockScreens: { name: string; component: any }[] = [];
jest.mock('@react-navigation/drawer', () => ({
  createDrawerNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: (props: any) => { mockScreens.push(props); return null; },
  }),
}));
jest.mock('../../components/common/DrawerContent', () => () => null);
jest.mock('../../screens/student/dashboard/DashboardScreen', () => () => null);
jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../lazyScreens', () => ({
  createLazyScreenGroup: () => ({
    lazyScreen: (loader: any) => Object.assign(() => null, { loader }),
    prefetchAll: async () => {},
  }),
  useRoleWarmup: () => {},
}));

test('registers the Current Affairs screens right after Messages/Announcements, each lazy-loaded', async () => {
  await render(<AppNavigator />);
  const names = mockScreens.map((s) => s.name);
  const at = names.indexOf('Announcements');
  expect(names.slice(at + 1, at + 4)).toEqual(['CurrentAffairs', 'CurrentAffairsStory', 'CurrentAffairsQuiz']);

  const expected: Record<string, string> = {
    CurrentAffairs: 'DigestScreen', CurrentAffairsStory: 'StoryScreen', CurrentAffairsQuiz: 'QuizScreen',
  };
  for (const [name, file] of Object.entries(expected)) {
    const screen = mockScreens.find((s) => s.name === name)!;
    expect(typeof screen.component.loader).toBe('function'); // loaded from its own chunk on first open
    expect(screen.component.loader.toString()).toContain(`current-affairs/${file}`);
  }
});
