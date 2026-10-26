import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import ParentLearningScreen from '../../ParentLearningScreen';

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com', name: 'Jane Doe', uid: '123' }, role: 'parent' }),
  getPendingReturnRole: () => null,
}));

jest.mock('../../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false, showPermanentSidebar: true }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: jest.fn(),
  useRoute: () => ({ name: 'ParentLearning' }),
}));

import * as parentLearningService from '../../services/parentLearningService';

jest.mock('../../services/parentLearningService', () => ({
  fetchChildren: jest.fn(),
  fetchStudentStats: jest.fn(),
  fetchChildReport: jest.fn(),
  fetchCurriculumSubjects: jest.fn(),
  fetchSubjectTopics: jest.fn(),
  fetchTopicAttempts: jest.fn(),
}));

const CHILD_A = { id: 'c1', name: 'Kid A', email: 'a@test.com', grade: 'Grade 3', curriculum: 'NCERT' };
const CHILD_B = { id: 'c2', name: 'Kid B', email: 'b@test.com', grade: 'PYP 4', curriculum: 'IB PYP' };

const renderScreen = async (route: any = {}) => {
  return await render(
    <ParentLearningScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} route={route} />,
  );
};

describe('ParentLearningScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: [], topicsExplored: 0 });
    (parentLearningService.fetchChildReport as jest.Mock).mockResolvedValue(null);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([]);
    (parentLearningService.fetchSubjectTopics as jest.Mock).mockResolvedValue([]);
    (parentLearningService.fetchTopicAttempts as jest.Mock).mockResolvedValue([]);
  });

  it('shows the curriculum summary and subjects overview for the auto-selected first child', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([
      { subject: 'Mathematics', topicCount: 10, chapterCount: 4 },
    ]);

    await renderScreen();

    // Legacy "NCERT" child: queried and labelled as CBSE, never NCERT.
    await waitFor(() => {
      expect(parentLearningService.fetchCurriculumSubjects).toHaveBeenCalledWith('Grade 3', 'CBSE');
    });
    expect(await screen.findByText('CBSE · 1 Subjects')).toBeTruthy();
    expect(screen.queryByText(/NCERT/)).toBeNull();
    expect(await screen.findByText('Mathematics')).toBeTruthy();
  });

  it('shows the empty state when no curriculum content exists for this grade', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([]);

    await renderScreen();

    expect(await screen.findByText(/No content found for/)).toBeTruthy();
  });

  it('switching the child tab loads that child\'s own subjects', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A, CHILD_B]);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock)
      .mockResolvedValueOnce([{ subject: 'Mathematics', topicCount: 10 }])
      .mockResolvedValueOnce([{ subject: 'Science', topicCount: 8 }]);

    await renderScreen();
    expect(await screen.findByText('Mathematics')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Kid B'));
    });

    await waitFor(() => {
      expect(parentLearningService.fetchCurriculumSubjects).toHaveBeenCalledWith('PYP 4', 'IB PYP');
    });
    expect(await screen.findByText('Science')).toBeTruthy();
  });

  it('expanding a subject card shows its topic detail panel', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([
      { subject: 'Mathematics', topicCount: 2, topics: ['Fractions', 'Decimals'] },
    ]);

    await renderScreen();
    const card = await screen.findByText('Mathematics');

    await act(async () => {
      fireEvent.press(card);
    });

    expect(await screen.findByText('Fractions')).toBeTruthy();
    expect(await screen.findByText('Decimals')).toBeTruthy();
    expect(screen.getAllByText('Not started').length).toBe(2);
  });

  it('shows each unit, per-topic best score and tries, and the mistakes of a practice try', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: ['Fractions'], topicsExplored: 2 });
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([
      { subject: 'Mathematics', topicCount: 3, topics: [
        { topic: 'Fractions', unit: 'Numbers' }, { topic: 'Decimals', unit: 'Numbers' }, { topic: 'Angles', unit: 'Geometry' },
      ] },
    ]);
    const q = (question: string, studentAnswer: string, correctAnswer: string) =>
      ({ question, studentAnswer, correctAnswer, isCorrect: studentAnswer === correctAnswer, timeSeconds: 5 });
    (parentLearningService.fetchTopicAttempts as jest.Mock).mockResolvedValue([
      { id: 'a2', topic: 'Fractions', subject: 'Mathematics', attemptNumber: 2, score: 100, passed: true, totalQuestions: 2, correctAnswers: 2, timeSpentSeconds: 60, createdAt: '2026-10-25T10:00:00Z', questions: [q('1/2 + 1/2?', '1', '1'), q('1/4 x 2?', '1/2', '1/2')] },
      { id: 'a1', topic: 'Fractions', subject: 'Mathematics', attemptNumber: 1, score: 50, passed: false, totalQuestions: 2, correctAnswers: 1, timeSpentSeconds: 90, createdAt: '2026-10-24T10:00:00Z', questions: [q('1/2 + 1/2?', '2/4', '1'), q('1/4 x 2?', '1/2', '1/2')] },
    ]);

    await renderScreen();
    await act(async () => { fireEvent.press(await screen.findByText('Mathematics')); });

    expect(await screen.findByText('Numbers')).toBeTruthy();
    expect(screen.getByText('Geometry')).toBeTruthy();
    expect(await screen.findByText('100%')).toBeTruthy(); // best score
    expect(screen.getByText('· 2 tries')).toBeTruthy();
    // 1 topic practised, 2 tries, 150s total → per-topic averages.
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('2m 30s')).toBeTruthy();
    expect(parentLearningService.fetchTopicAttempts).toHaveBeenCalledWith('c1', 'Mathematics');

    await act(async () => { fireEvent.press(screen.getByTestId('topic-row-Fractions')); });
    expect(await screen.findByTestId('attempt-review')).toBeTruthy();
    expect(screen.getByText('2/2 correct')).toBeTruthy(); // latest try first

    await act(async () => { fireEvent.press(screen.getByTestId('attempt-tab-1')); });
    expect(screen.getByText('1/2 correct')).toBeTruthy();
    // Mistakes only by default: the wrong answer and the right one.
    expect(screen.getAllByTestId('attempt-question')).toHaveLength(1);
    expect(screen.getByText('Answered: 2/4')).toBeTruthy();
    expect(screen.getByText('Correct: 1')).toBeTruthy();

    await act(async () => { fireEvent.press(screen.getByTestId('mistakes-only-toggle')); });
    expect(screen.getAllByTestId('attempt-question')).toHaveLength(2);
  });

  it('tapping a subject scrolls its details into view; closing scrolls back to the subjects', async () => {
    const { ScrollView } = require('react-native');
    const original = ScrollView.prototype.scrollTo;
    const scrollTo = jest.fn();
    ScrollView.prototype.scrollTo = scrollTo;
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([
      { subject: 'Mathematics', topicCount: 1, topics: ['Fractions'] },
    ]);

    await renderScreen();
    await act(async () => { fireEvent.press(await screen.findByText('Mathematics')); });
    await act(async () => {
      fireEvent(screen.getByTestId('subject-detail-anchor'), 'layout', { nativeEvent: { layout: { x: 0, y: 900, width: 800, height: 400 } } });
    });
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 888, animated: true });

    // Later layout changes (e.g. a topic expanding) don't scroll again.
    scrollTo.mockClear();
    await act(async () => {
      fireEvent(screen.getByTestId('subject-detail-anchor'), 'layout', { nativeEvent: { layout: { x: 0, y: 900, width: 800, height: 700 } } });
    });
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => { fireEvent.press(screen.getByLabelText('Close subject details')); });
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('subject-detail-anchor')).toBeNull();
    ScrollView.prototype.scrollTo = original;
  });

  it('pre-selects the child passed via route params', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A, CHILD_B]);

    await renderScreen({ params: { childId: 'c2' } });

    await waitFor(() => {
      expect(parentLearningService.fetchCurriculumSubjects).toHaveBeenCalledWith('PYP 4', 'IB PYP');
    });
  });
});
