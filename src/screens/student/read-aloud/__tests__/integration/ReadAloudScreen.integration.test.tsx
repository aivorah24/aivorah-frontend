import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ReadAloudScreen from '../../ReadAloudScreen';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack, canGoBack: () => true }),
}));
jest.mock('../../../../../components/common/Header', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: T, TouchableOpacity: Btn } = require('react-native');
  const MockHeader = (props: any) => (
    <Btn onPress={props.onBack} accessibilityLabel="Back">
      <T>{props.title}</T>
      <T>{props.subtitle}</T>
    </Btn>
  );
  return MockHeader;
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ children }: any) => children);
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: true,
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', borderColor: '#333333', textMain: '#F5F3EE', textMuted: '#A9B0AC',
      textDim: '#6E736B', accentYellow: '#BAA467',
    },
  }),
}));
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'kid@school.com', role: 'student', grade: 'Grade 4' } }),
}));
jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: async () => 'tok-student' }, authStateReady: async () => {} },
}));

const BASE = `${LEARNING_PATHS_SERVER_URL}/read-aloud`;
const LIST = [
  { title: 'Our Solar System', topic: 'Where We Are in Place and Time', level: 'easy', wordCount: 90, icon: 'sun' },
  { title: 'Migration and Movement', topic: 'Where We Are in Place and Time', level: 'medium', wordCount: 120 },
  { title: 'Democracy and Governance', topic: 'How We Organize Ourselves', level: 'hard', wordCount: 160 },
];
const SOLAR = { ...LIST[0], text: 'Our solar system is a family of planets orbiting the Sun.' };

type Routes = { lexile?: any; passages?: any; passagesOk?: boolean; passage?: any; passageOk?: boolean };
function mockServer(routes: Routes = {}) {
  const r = { lexile: { lexile: 450, needsCalibration: false }, passages: { passages: LIST }, passagesOk: true, passage: SOLAR, passageOk: true, ...routes };
  global.fetch = jest.fn(async (url: string) => {
    const reply = (ok: boolean, body: any) => ({ ok, status: ok ? 200 : 500, json: async () => body });
    if (url.startsWith(`${BASE}/lexile`)) return reply(true, r.lexile);
    if (url.startsWith(`${BASE}/passages`)) return reply(r.passagesOk, r.passagesOk ? r.passages : { error: 'Service unavailable' });
    if (url.startsWith(`${BASE}/passage`)) return reply(r.passageOk, r.passageOk ? r.passage : { error: 'boom' });
    if (url.startsWith(`${BASE}/calibration`)) return reply(true, { title: 'The River Journey', text: 'Rivers are nature highways.' });
    return reply(true, {});
  }) as any;
}

const readAloudCalls = () => (global.fetch as jest.Mock).mock.calls.filter(([u]) => String(u).startsWith(BASE));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ReadAloudScreen — integration', () => {
  test('loads the grade\'s stories from the Learning Paths service as the signed-in student', async () => {
    mockServer();
    await render(<ReadAloudScreen />);
    expect(await screen.findByText('Our Solar System')).toBeTruthy();
    expect(screen.getByText('Lexile 450L')).toBeTruthy();
    expect(screen.getByText('Grade 4 · IB PYP Reading Practice')).toBeTruthy();

    await waitFor(() => expect(readAloudCalls().some(([u]) => u === `${BASE}/passages?grade=Grade+4&lexile=450`)).toBe(true));
    for (const [url, init] of readAloudCalls()) {
      expect(url).not.toContain('email');
      expect(init.headers.Authorization).toBe('Bearer tok-student');
    }
  });

  test('difficulty tabs filter the stories', async () => {
    mockServer();
    await render(<ReadAloudScreen />);
    await screen.findByText('Our Solar System');
    await fireEvent.press(screen.getByTestId('read-aloud-filter-hard'));
    expect(screen.getByText('Democracy and Governance')).toBeTruthy();
    expect(screen.queryByText('Our Solar System')).toBeNull();
    await fireEvent.press(screen.getByTestId('read-aloud-filter-all'));
    expect(screen.getByText('Our Solar System')).toBeTruthy();
  });

  test('a failed list shows an error with Try again', async () => {
    mockServer({ passagesOk: false });
    await render(<ReadAloudScreen />);
    expect(await screen.findByText("Couldn't load stories. Service unavailable")).toBeTruthy();
    mockServer();
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Our Solar System')).toBeTruthy();
  });

  test('a grade with no stories says so', async () => {
    mockServer({ passages: { passages: [] } });
    await render(<ReadAloudScreen />);
    expect(await screen.findByText('No stories for your grade yet.')).toBeTruthy();
  });

  test('opening a story shows its text with Listen First and Start Reading; Back returns to the list', async () => {
    mockServer();
    await render(<ReadAloudScreen />);
    await fireEvent.press(await screen.findByText('Our Solar System'));
    expect(await screen.findByText('Listen First')).toBeTruthy();
    expect(screen.getByText('Start Reading')).toBeTruthy();
    expect(screen.getByText('90 words')).toBeTruthy();
    expect(screen.getByTestId('read-aloud-passage-text')).toHaveTextContent(/Our solar system is a family of planets/);
    const body = JSON.parse(readAloudCalls().find(([u]) => u === `${BASE}/passage`)![1].body);
    expect(body).toEqual({ grade: 'Grade 4', topic: 'Our Solar System' });

    await fireEvent.press(screen.getByLabelText('Back'));
    expect(await screen.findByText('Surprise Me!')).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('a story that fails to load explains it', async () => {
    mockServer({ passageOk: false });
    await render(<ReadAloudScreen />);
    await fireEvent.press(await screen.findByText('Surprise Me!'));
    expect(await screen.findByText('Could not load passage. Please try again.')).toBeTruthy();
    expect(screen.getByText('Our Solar System')).toBeTruthy();
  });

  test('a new student sees the reading check and can skip it', async () => {
    mockServer({ lexile: { lexile: null, needsCalibration: true } });
    await render(<ReadAloudScreen />);
    expect(await screen.findByText('Reading Level Check')).toBeTruthy();
    await fireEvent.press(screen.getByText('Skip for now'));
    expect(await screen.findByText('Lexile 400L')).toBeTruthy();
    expect(await screen.findByText('Our Solar System')).toBeTruthy();
  });
});
