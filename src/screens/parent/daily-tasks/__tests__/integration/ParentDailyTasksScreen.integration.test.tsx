import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import ParentDailyTasksScreen from '../../ParentDailyTasksScreen';

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com', name: 'Jane Doe', uid: '123' }, role: 'parent' }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: jest.fn(),
  useRoute: () => ({ name: 'ParentDailyTasks' }),
}));

import * as dailyTasksService from '../../services/dailyTasksService';

jest.mock('../../services/dailyTasksService', () => ({
  fetchChildren: jest.fn(),
  fetchTasks: jest.fn(),
  createTask: jest.fn(),
  deleteTask: jest.fn(),
}));

const renderScreen = async () => {
  return await render(
    <ParentDailyTasksScreen navigation={{ navigate: mockNavigate, openDrawer: jest.fn() }} />
  );
};

describe('ParentDailyTasksScreen Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty-children state when the parent has no linked kids', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([]);

    await renderScreen();

    await waitFor(() => expect(dailyTasksService.fetchChildren).toHaveBeenCalledWith('parent@example.com'));
    expect(await screen.findByText('No children linked yet.')).toBeTruthy();
  });

  it('auto-selects the first child and lists their assigned tasks', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Kiddo', grade: 'Grade 3' }]);
    (dailyTasksService.fetchTasks as jest.Mock).mockResolvedValue([
      { id: 't1', label: 'Read for 20 mins', coins: 10, icon: 'book-open', completedToday: false },
    ]);

    await renderScreen();

    await waitFor(() => expect(dailyTasksService.fetchTasks).toHaveBeenCalledWith('c1'));
    expect(await screen.findByText('Read for 20 mins')).toBeTruthy();
    expect(screen.getAllByText('10 coins').length).toBeGreaterThan(0);
  });

  it('adds a new task through the form', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Kiddo' }]);
    (dailyTasksService.fetchTasks as jest.Mock).mockResolvedValue([]);
    (dailyTasksService.createTask as jest.Mock).mockResolvedValue({
      id: 't2', label: 'Tidy up your room', coins: 5, icon: 'check-circle',
    });

    await renderScreen();
    await waitFor(() => expect(dailyTasksService.fetchTasks).toHaveBeenCalled(), { timeout: 5000 });

    const input = await screen.findByPlaceholderText("New task for Kiddo (e.g. Read for 20 mins)");
    await act(async () => {
      fireEvent.changeText(input, 'Tidy up your room');
    });

    const addBtn = await screen.findByTestId('add-task-btn');
    await act(async () => {
      fireEvent.press(addBtn);
    });

    await waitFor(() => {
      expect(dailyTasksService.createTask).toHaveBeenCalledWith({
        parentEmail: 'parent@example.com', childId: 'c1', childName: 'Kiddo', grade: undefined, curriculum: undefined,
        label: 'Tidy up your room', icon: 'check-circle', coins: 5,
      });
    }, { timeout: 5000 });
    await waitFor(() => {
      expect(screen.getAllByText('Tidy up your room').filter(el => el).length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  }, 15000);

  it('shows a validation error when submitting without a label', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Kiddo' }]);
    (dailyTasksService.fetchTasks as jest.Mock).mockResolvedValue([]);

    await renderScreen();
    // Wait for the child to be selected so the form (and its Add button) renders.
    const addBtn = await screen.findByTestId('add-task-btn', {}, { timeout: 5000 });

    // Empty label: the validation path must never reach the service.
    await act(async () => {
      fireEvent.press(addBtn);
    });
    expect(dailyTasksService.createTask).not.toHaveBeenCalled();
    expect(await screen.findByText('Please enter a task description.')).toBeTruthy();
  }, 15000);

  it('deletes a task via the trash action', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Kiddo' }]);
    (dailyTasksService.fetchTasks as jest.Mock).mockResolvedValue([
      { id: 't1', label: 'Read for 20 mins', coins: 10, icon: 'book-open', completedToday: false },
    ]);
    (dailyTasksService.deleteTask as jest.Mock).mockResolvedValue(undefined);

    await renderScreen();
    expect(await screen.findByText('Read for 20 mins', {}, { timeout: 5000 })).toBeTruthy();

    const trashBtn = await screen.findByTestId('delete-task-t1', {}, { timeout: 5000 });
    await act(async () => {
      fireEvent.press(trashBtn);
    });

    await waitFor(() => expect(dailyTasksService.deleteTask).toHaveBeenCalledWith('t1'), { timeout: 5000 });
  }, 15000);
});
