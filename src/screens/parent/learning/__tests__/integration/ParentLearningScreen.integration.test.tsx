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

  it('pre-selects the child passed via route params', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A, CHILD_B]);

    await renderScreen({ params: { childId: 'c2' } });

    await waitFor(() => {
      expect(parentLearningService.fetchCurriculumSubjects).toHaveBeenCalledWith('PYP 4', 'IB PYP');
    });
  });
});
