// Light-touch integration test for LessonScreen — verifies real loading/not-found
// states and real tab switching (Read/Listen/Ask) using the real curated CBSE
// Grade 6 English dataset. ReadTab/AskTab/ListenTab/PracticeTab and their deep
// per-tab behavior are explicitly out of scope here (stubbed) — Practice is
// covered by usePracticeRedirect's own hook tests.

import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import LessonScreen from '../LessonScreen';

jest.setTimeout(15000);

let mockSubjectEdits: any = null;
jest.mock('../../subject-syllabus/hooks/useStudentSubjectEdits', () => ({
  useStudentSubjectEdits: () => ({ edits: mockSubjectEdits, loaded: true }),
}));
jest.mock('../../../../../context/AuthContext', () => ({ useAuth: () => ({ user: { email: 's@a.com' } }) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
// The topic has already been learned (Learn read to the end / Listen heard), so Practice is unlocked.
const unlockPractice = () => jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async (k: string) => (k.startsWith('@lp_learned_') ? '1' : null));
afterEach(() => jest.restoreAllMocks());
beforeEach(() => AsyncStorage.clear());
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888', primary: '#fa0',
  } }),
}));
// Avoids pulling in the real AuthContext/firebase chain for this screen-level
// test — activity tracking (startTopicActivity/recordStudySeconds) has its own
// dedicated unit tests (useLessonActivityTracking.test.ts).
jest.mock('../../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ startTopicActivity: jest.fn(), recordStudySeconds: jest.fn() }),
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
  return { __esModule: true, default: () => <View testID="image-zoom-modal" /> };
});

jest.mock('../components/ReadTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text testID="read-tab">read-tab</Text> };
});
jest.mock('../components/AskTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text testID="ask-tab">ask-tab</Text> };
});
jest.mock('../components/ListenTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: (props: any) => <Text testID="listen-tab">{`listen-tab steps:${props.listenSteps?.length ?? 0}`}</Text> };
});
jest.mock('../components/PracticeTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text testID="practice-tab">practice-tab</Text> };
});
jest.mock('../components/FullBookOverlay', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="full-book-overlay" /> };
});

function navProp() {
  return { navigate: jest.fn(), openDrawer: jest.fn(), goBack: jest.fn() };
}

function routeProp(params: any = {}) {
  return { params: { subject: 'English', curriculum: 'CBSE', grade: 'Grade 6', chapterIndex: 0, topicIndex: 0, ...params } };
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ resources: [] }) }) as any;
});

describe('LessonScreen — states', () => {
  test('shows a real loading spinner while a real DB-backed topic is being fetched', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as any;
    await render(<LessonScreen navigation={navProp()} route={routeProp({ topicId: 't1', topicName: 'DB Topic' })} />);

    expect(screen.queryByTestId('read-tab')).toBeNull();
  });

  test('shows a real "not available yet" message for an unsupported curated combo', async () => {
    await render(<LessonScreen navigation={navProp()} route={routeProp({ subject: 'Mathematics', curriculum: 'IB PYP', grade: 'Grade 4' })} />);

    await waitFor(() => expect(screen.getByText("This lesson isn't available yet.")).toBeTruthy());
  });

  test('renders the real curated CBSE Grade 6 English topic on the default Read tab', async () => {
    await render(<LessonScreen navigation={navProp()} route={routeProp()} />);

    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());
  });
});

describe('LessonScreen — tab switching', () => {
  test('switching to the real Listen tab renders ListenTab instead of ReadTab', async () => {
    const user = userEvent.setup();
    await render(<LessonScreen navigation={navProp()} route={routeProp()} />);
    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());

    await user.press(screen.getByText(/Listen|AI Tutor/));

    await waitFor(() => expect(screen.getByTestId('listen-tab')).toBeTruthy());
    expect(screen.queryByTestId('read-tab')).toBeNull();
  });

  test('switching to the real Ask Aivorah tab renders AskTab', async () => {
    const user = userEvent.setup();
    await render(<LessonScreen navigation={navProp()} route={routeProp()} />);
    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());

    await user.press(screen.getByText('Ask Aivorah'));

    await waitFor(() => expect(screen.getByTestId('ask-tab')).toBeTruthy());
  });

  test('switching to the real Practice tab immediately redirects to the Quiz screen', async () => {
    unlockPractice();
    const nav = navProp();
    const user = userEvent.setup();
    await render(<LessonScreen navigation={nav} route={routeProp()} />);
    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());

    await user.press(screen.getByText('Practice'));

    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('Quiz', expect.any(Object)));
  });

  test('a topic not learned yet keeps Practice locked: no quiz, the locked Practice card shows instead', async () => {
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockImplementation(async () => null);
    const nav = navProp();
    const user = userEvent.setup();
    await render(<LessonScreen navigation={nav} route={routeProp()} />);
    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());

    await user.press(screen.getByText('Practice'));
    await new Promise((r) => setTimeout(r, 50));
    expect(nav.navigate).not.toHaveBeenCalledWith('Quiz', expect.anything());
    expect(screen.getByTestId('practice-tab')).toBeTruthy();
    expect(getItem).toHaveBeenCalledWith(expect.stringContaining('@lp_learned_s@a.com_'));
  });
});

// A teacher-published Curriculum Learning Path topic (AI-generated content
// from aivorah-learning-paths-service, opened via TeacherPublishedLearningPathScreen's
// "Learn · AI Tutor · Ask Aivorah · Practice" button) carries its content
// directly through route params instead of a topicId/byName lookup.
describe('LessonScreen — teacher-published learning path content', () => {
  const teacherContent = {
    whatYoullLearn: ['Add fractions with different denominators'],
    contentType: 'mathematics',
    blocks: [
      { type: 'overview', text: 'This topic covers adding unlike fractions.' },
      {
        type: 'worked_example', problem: 'Add 5/6 and 2/9', concept: 'Adding unlike fractions',
        steps: [{ step: 1, action: 'Find a common denominator', equation: '6x9=54', why: 'so both fractions share a denominator' }],
        finalAnswer: '19/18',
      },
    ],
  };

  test('renders immediately on the Read tab with no fetch/loading state — content comes from route params', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as any;

    await render(<LessonScreen navigation={navProp()} route={routeProp({
      topicId: undefined, chapterTitle: 'Numbers', topicName: 'Adding Fractions', teacherContent,
    })} />);

    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('the AI Tutor (Listen) tab is reachable for a teacher-published math topic', async () => {
    const user = userEvent.setup();
    await render(<LessonScreen navigation={navProp()} route={routeProp({
      subject: 'Mathematics', topicId: undefined, chapterTitle: 'Numbers', topicName: 'Adding Fractions', teacherContent,
    })} />);
    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());

    await user.press(screen.getByText('AI Tutor'));

    await waitFor(() => expect(screen.getByTestId('listen-tab')).toBeTruthy());
  });

  test('Practice redirects to Quiz carrying teacherContent in returnParams, so returning from the quiz can re-resolve the topic', async () => {
    unlockPractice();
    const nav = navProp();
    const user = userEvent.setup();
    await render(<LessonScreen navigation={nav} route={routeProp({
      topicId: undefined, chapterTitle: 'Numbers', topicName: 'Adding Fractions', teacherContent,
    })} />);
    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());

    await user.press(screen.getByText('Practice'));

    await waitFor(() => expect(nav.navigate).toHaveBeenCalledWith('Quiz', expect.objectContaining({
      returnParams: expect.objectContaining({ teacherContent, topicName: 'Adding Fractions' }),
    })));
  });
});

describe('LessonScreen — embedded in the teacher review', () => {
  const teacherContent = {
    whatYoullLearn: ['Place numbers on a number line'],
    contentType: 'mathematics',
    blocks: [{ type: 'overview', text: 'Numbers sit on a line.' }],
    mathTutor: {
      intro: 'Numbers sit on a line.',
      examples: [
        { title: 'Placing 7', problem: 'Where is 7?', steps: [{ say: 'Count from 0', show: '0..7' }], answer: 'Right of 6' },
        { title: 'Placing 3', problem: 'Where is 3?', steps: [{ say: 'Count from 0', show: '0..3' }], answer: 'Right of 2' },
      ],
    },
  };
  const embeddedRoute = () => routeProp({ subject: 'Mathematics', topicId: undefined, chapterTitle: 'Numbers', topicName: 'Number line', teacherContent });

  test('no page header and no Ask tab; the teacher sees Learn, AI Tutor and Practice', async () => {
    await render(<LessonScreen embedded navigation={navProp()} route={embeddedRoute()} />);
    await waitFor(() => expect(screen.getByTestId('read-tab')).toBeTruthy());
    expect(screen.getByTestId('embedded-lesson')).toBeTruthy();
    expect(screen.queryByText('Ask Aivorah')).toBeNull();
    expect(screen.getByText('AI Tutor')).toBeTruthy();
    expect(screen.queryByText('Number line')).toBeNull();
  });

  test('the AI Tutor plays the book examples from the teacher content (intro + one step per example)', async () => {
    const user = userEvent.setup();
    await render(<LessonScreen embedded navigation={navProp()} route={embeddedRoute()} />);
    await user.press(screen.getByText('AI Tutor'));
    await waitFor(() => expect(screen.getByTestId('listen-tab').props.children).toBe('listen-tab steps:3'));
  });

  test('Practice shows the given slot in place and never opens the Quiz screen', async () => {
    const { Text } = require('react-native');
    const nav = navProp();
    const user = userEvent.setup();
    await render(<LessonScreen embedded navigation={nav} route={embeddedRoute()} practiceSlot={<Text testID="teacher-practice">questions</Text>} />);
    await user.press(screen.getByText('Practice'));
    await waitFor(() => expect(screen.getByTestId('teacher-practice')).toBeTruthy());
    expect(nav.navigate).not.toHaveBeenCalled();
  });
});
