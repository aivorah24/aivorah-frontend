import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import TeacherPublishedLearningPathScreen from '../../TeacherPublishedLearningPathScreen';

jest.mock('../../../../../../config/firebase', () => ({
  auth: { currentUser: { getIdToken: jest.fn().mockResolvedValue('real-id-token') } },
}));
jest.mock('../../../../../../config/learningPathsServerUrl', () => 'https://server.test');
jest.mock('../../../../../../components/common/Header', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="header-stub" /> };
});
jest.mock('../../../../../../components/common/ScreenLayout', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function jsonResponse(body: any, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
}

const route = { params: { curriculumId: 'c1', title: 'Grade 6 Maths' } };
const navigation = {};

describe('TeacherPublishedLearningPathScreen', () => {
  test('renders units and one tappable row per topic (no raw objectives/lessons dump)', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      learningPath: {
        id: 'lp1', curriculumId: 'c1', publishedAt: 'x',
        content: {
          version: 1,
          units: [{
            title: 'Numbers', order: 0,
            topics: [{
              title: 'Whole Numbers', order: 0,
              objectives: ['Add two numbers'],
              lessons: [{ title: 'Intro', summary: 'Basics of addition' }],
              subtopics: [],
            }],
          }],
        },
      },
    })) as any;

    await render(<TeacherPublishedLearningPathScreen route={route} navigation={navigation} />);

    await waitFor(() => expect(screen.getByTestId('teacher-lp-unit-0')).toBeTruthy());
    expect(screen.getByText('Numbers')).toBeTruthy();
    expect(screen.getByText('Whole Numbers')).toBeTruthy();
    expect(screen.queryByText(/Add two numbers/)).toBeNull();
    expect(screen.queryByText('Intro')).toBeNull();
  });

  test('shows a not-found message on a 404 without leaking draft-vs-missing distinction', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'No published learning path found' }, false, 404)) as any;
    await render(<TeacherPublishedLearningPathScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('teacher-lp-detail-not-found')).toBeTruthy());
  });

  test('shows an access-denied message on a 403', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'Not authorized for this learning path' }, false, 403)) as any;
    await render(<TeacherPublishedLearningPathScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('teacher-lp-detail-forbidden')).toBeTruthy());
  });

  test('shows a server error message on a 500', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ error: 'Failed to load the learning path' }, false, 500)) as any;
    await render(<TeacherPublishedLearningPathScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('teacher-lp-detail-error')).toBeTruthy());
  });

  test('shows an empty-content message when published with zero units', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      learningPath: { id: 'lp1', curriculumId: 'c1', publishedAt: 'x', content: { version: 1, units: [] } },
    })) as any;
    await render(<TeacherPublishedLearningPathScreen route={route} navigation={navigation} />);
    await waitFor(() => expect(screen.getByTestId('teacher-lp-detail-empty')).toBeTruthy());
  });

  test('a topic with real AI-generated content and full metadata gets an open action into LessonScreen', async () => {
    const teacherContent = { whatYoullLearn: ['Add unlike fractions'], blocks: [{ type: 'overview', text: 'x' }], contentType: 'mathematics' };
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      learningPath: {
        id: 'lp1', curriculumId: 'c1', publishedAt: 'x',
        content: {
          version: 1,
          metadata: { grade: '6', subject: 'Mathematics', curriculum: 'NCERT' },
          units: [{
            title: 'Numbers', order: 0,
            topics: [{
              title: 'Adding Fractions', order: 0, objectives: [], lessons: [], subtopics: [],
              content: teacherContent, groundingSource: 'ncert_vector',
            }],
          }],
        },
      },
    })) as any;
    const navigate = jest.fn();

    await render(<TeacherPublishedLearningPathScreen route={route} navigation={{ navigate }} />);
    await waitFor(() => expect(screen.getByTestId('teacher-topic-c1-0-0')).toBeTruthy());
    expect(screen.getByText('Learn · AI Tutor · Practice')).toBeTruthy();
    fireEvent.press(screen.getByTestId('teacher-topic-c1-0-0'));

    expect(navigate).toHaveBeenCalledWith('LessonScreen', expect.objectContaining({
      grade: 'Grade 6', subject: 'Mathematics', curriculum: 'NCERT',
      chapterIndex: 0, topicIndex: 0, chapterTitle: 'Numbers', topicName: 'Adding Fractions',
      teacherContent,
    }));
  });

  test('a topic with no generated content yet gets no open action', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      learningPath: {
        id: 'lp1', curriculumId: 'c1', publishedAt: 'x',
        content: {
          version: 1,
          metadata: { grade: '6', subject: 'Mathematics', curriculum: 'NCERT' },
          units: [{
            title: 'Numbers', order: 0,
            topics: [{ title: 'Not Ready Yet', order: 0, objectives: [], lessons: [], subtopics: [], content: null }],
          }],
        },
      },
    })) as any;
    const navigate = jest.fn();
    await render(<TeacherPublishedLearningPathScreen route={route} navigation={{ navigate }} />);
    await waitFor(() => expect(screen.getByTestId('teacher-topic-c1-0-0')).toBeTruthy());
    expect(screen.getByText('Being prepared by your teacher')).toBeTruthy();
    fireEvent.press(screen.getByTestId('teacher-topic-c1-0-0'));
    expect(navigate).not.toHaveBeenCalled();
  });

  test('a topic with content but missing curriculum metadata (grade/subject) gets no open action', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({
      learningPath: {
        id: 'lp1', curriculumId: 'c1', publishedAt: 'x',
        content: {
          version: 1,
          units: [{
            title: 'Numbers', order: 0,
            topics: [{ title: 'X', order: 0, objectives: [], lessons: [], subtopics: [], content: { whatYoullLearn: [], blocks: [] } }],
          }],
        },
      },
    })) as any;
    const navigate = jest.fn();
    await render(<TeacherPublishedLearningPathScreen route={route} navigation={{ navigate }} />);
    await waitFor(() => expect(screen.getByTestId('teacher-topic-c1-0-0')).toBeTruthy());
    fireEvent.press(screen.getByTestId('teacher-topic-c1-0-0'));
    expect(navigate).not.toHaveBeenCalled();
  });
});
