// Integration test for TeacherLearningPathsScreen — fully static content, no
// backend calls, so unlike most teacher screens in this codebase there's no
// fetch mocking needed. Just useWindowDimensions/useTheme mocked (same
// pattern as the Dashboard/Students/Schedule integration tests).
import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import TeacherLearningPathsScreen from '../../TeacherLearningPathsScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'TeacherLearningPaths', name: 'TeacherLearningPaths' }),
  useFocusEffect: () => {},
}));

const MOCK_TEACHER_USER = { email: 'teacher@aivorah.test', name: 'Priya Menon' };
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: MOCK_TEACHER_USER }),
  getPendingReturnRole: () => null,
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#000', cardDark: '#111', borderColor: '#222', textMain: '#fff', textMuted: '#ccc',
      textDim: '#999', textHeading: '#fff', accentYellow: '#FFD700', accentCyan: '#0ff', cardHover: '#333',
    },
  }),
}));

const navigation = { openDrawer: jest.fn() };

describe('TeacherLearningPathsScreen integration', () => {
  test('renders both course videos and the full course list with real titles', async () => {
    await render(<TeacherLearningPathsScreen navigation={navigation} />);

    expect(screen.getByText('From Average Prompts to Outstanding Teaching')).toBeTruthy();
    expect(screen.getByText('Create Engaging Learning Experiences with AI')).toBeTruthy();
    expect(screen.getByText('Learning Path Overview')).toBeTruthy();
    expect(screen.getByText('Meet Your AI Assistants')).toBeTruthy();
    expect(screen.getByText('ChatGPT for Teachers')).toBeTruthy();
    expect(screen.getByText('Your Daily AI Workflow + Safety')).toBeTruthy();
    // "6 courses • N lessons • about M minutes" — real computed numbers, not hardcoded.
    expect(screen.getByText(/6 courses/)).toBeTruthy();
  });

  test('tapping a course card opens its detail modal with the real lesson content, and the close button dismisses it', async () => {
    const user = userEvent.setup();
    await render(<TeacherLearningPathsScreen navigation={navigation} />);

    await user.press(screen.getByTestId('teacher-learning-paths-course-claude'));
    expect(screen.getByTestId('teacher-learning-paths-course-modal')).toBeTruthy();
    expect(screen.getByText('Work with long documents')).toBeTruthy();

    await user.press(screen.getByTestId('teacher-learning-paths-course-modal-close'));
    await waitFor(() => expect(screen.queryByTestId('teacher-learning-paths-course-modal-root')).toBeNull());
  });

  test('selecting a different course replaces the modal content with that course\'s own lessons', async () => {
    const user = userEvent.setup();
    await render(<TeacherLearningPathsScreen navigation={navigation} />);

    await user.press(screen.getByTestId('teacher-learning-paths-course-gemini'));
    expect(screen.getByText('Use Gemini inside Google tools')).toBeTruthy();
    await user.press(screen.getByTestId('teacher-learning-paths-course-modal-close'));

    await user.press(screen.getByTestId('teacher-learning-paths-course-perplexity'));
    expect(screen.getByText('Research you can trust')).toBeTruthy();
  });

  test('on mobile, pressing the menu button opens the drawer', async () => {
    const user = userEvent.setup();
    const nav = { openDrawer: jest.fn() };
    await render(<TeacherLearningPathsScreen navigation={nav} />);

    await user.press(screen.getByTestId('header-menu-button'));
    expect(nav.openDrawer).toHaveBeenCalled();
  });
});
