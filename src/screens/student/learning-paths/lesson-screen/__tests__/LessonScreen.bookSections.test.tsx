// Real LessonScreen + real Learn / Listen / Practice / AI Tutor tabs, fed the service's actual responses for built
// book sections (fixtures saved from the learning-paths service): an English piece, a Maths section and a Hindi unit.
import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import LessonScreen from '../LessonScreen';
import english from './fixtures/english-section.json';
import maths from './fixtures/maths-section.json';
import hindi from './fixtures/hindi-section.json';

jest.setTimeout(30000);

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#F5F3EE', cardDark: '#FFFFFF', borderColor: '#DDD', textMain: '#0B0B0B', textMuted: '#666', textDim: '#999',
    primary: '#5E7566', accentGreen: '#5E7566', accentYellow: '#9A7B2E', accentRed: '#C00', accentPurple: '#BAA467',
  }, isDark: false }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { View, Text } = require('react-native');
  return { __esModule: true, default: (props: any) => <View><Text>{props.title}</Text></View> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});
jest.mock('../../../../../components/common/ImageZoomModal', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});
jest.mock('../components/AskTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text>ask-tab</Text> };
});
jest.mock('../components/FullBookOverlay', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});
jest.mock('../components/ZoomableImage', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="zoomable-image" /> };
});

const nav = () => ({ navigate: jest.fn(), openDrawer: jest.fn(), goBack: jest.fn() });
const route = (subject: string, topicName: string) => ({ params: { subject, curriculum: 'CBSE', grade: 'Grade 8', chapterIndex: 0, topicIndex: 0, byNameTopic: topicName, topicName, chapterTitle: topicName } });
const serve = (payload: any) => {
  global.fetch = jest.fn(async (url: any) => ({
    ok: true,
    json: async () => (String(url).includes('topic-by-name') ? payload : { units: [], resources: [] }),
  })) as any;
};
const payloadOf = (j: any) => j.resources.find((r: any) => r.resourceType === 'AI_EXPLANATION').payload;
const tab = async (user: any, label: string) => user.press((await screen.findAllByText(label))[0]);

describe('built book sections, end to end through the real lesson tabs', () => {
  test('English piece: Learn lesson, Listen scenes with a visual, Practice quiz from the book', async () => {
    serve(english);
    const user = userEvent.setup();
    const navigation = nav();
    await render(<LessonScreen navigation={navigation} route={route('English', 'The Wit that Won Hearts')} />);
    await waitFor(() => expect(screen.getByText(/WHAT YOU.LL LEARN/)).toBeTruthy());

    await tab(user, 'Listen');
    const p = payloadOf(english);
    await waitFor(() => expect(screen.getByText(p.listenScript[0].heading)).toBeTruthy());
    expect(screen.getByTestId('listen-visual-board')).toBeTruthy();
    expect(screen.getByText('See It')).toBeTruthy();
    expect(screen.getByTestId(`scene-visual-${p.listenScript[0].visual.kind}`)).toBeTruthy();

    await tab(user, 'Practice');
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('Quiz', expect.anything()));
    const sent = navigation.navigate.mock.calls.find((c: any[]) => c[0] === 'Quiz')[1].practiceQuiz;
    expect(sent).toHaveLength(p.practiceQuiz.length);
    expect(sent[0]).toMatchObject({ type: 'mcq', question: p.practiceQuiz[0].question, options: p.practiceQuiz[0].options, correct: p.practiceQuiz[0].correctIndex });
  });

  test('Maths section: Learn shows the book examples as readable maths; AI Tutor has tabs, steps and the board', async () => {
    serve(maths);
    const user = userEvent.setup();
    await render(<LessonScreen navigation={nav()} route={route('Mathematics', '1.1 Square Numbers')} />);
    await waitFor(() => expect(screen.getAllByText('Worked example').length).toBeGreaterThan(0));
    expect(screen.queryByText(/\\sqrt|\\times/)).toBeNull();

    await tab(user, 'AI Tutor');
    expect(await screen.findByTestId('tutor-tab-0')).toBeTruthy();
    expect(screen.getByText('Example 1')).toBeTruthy();
    expect(screen.queryByText('Explain This Step')).toBeNull();
    expect(screen.queryByText('Show Another Example')).toBeNull();
    expect(screen.getByTestId('intro-board')).toBeTruthy();

    await user.press(screen.getByTestId('tutor-tab-1'));
    expect(await screen.findByTestId('tutor-steps')).toBeTruthy();
    expect(screen.getByTestId('math-board')).toBeTruthy();
    expect(screen.getByText('THE PROBLEM')).toBeTruthy();
  });

  test('Hindi unit: Hindi Learn, Hindi Listen with a visual, Hindi quiz', async () => {
    serve(hindi);
    const user = userEvent.setup();
    const p = payloadOf(hindi);
    const navigation = nav();
    await render(<LessonScreen navigation={navigation} route={route('Hindi', 'अहमदनगर का किला')} />);
    await waitFor(() => expect(screen.getByText(/WHAT YOU.LL LEARN/)).toBeTruthy());
    expect(screen.getByText(`• ${p.whatYoullLearn[0]}`)).toBeTruthy();

    await tab(user, 'Listen');
    await waitFor(() => expect(screen.getByText(p.listenScript[0].lines[0].text)).toBeTruthy());
    expect(screen.getByTestId('listen-visual-board')).toBeTruthy();

    await tab(user, 'Practice');
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('Quiz', expect.anything()));
    expect(navigation.navigate.mock.calls.find((c: any[]) => c[0] === 'Quiz')[1].practiceQuiz[0].question).toBe(p.practiceQuiz[0].question);
  });
});
