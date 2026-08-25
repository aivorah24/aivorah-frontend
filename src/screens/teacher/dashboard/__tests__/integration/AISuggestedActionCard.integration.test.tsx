import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import AISuggestedActionCard from '../../components/AISuggestedActionCard';

function baseProps(overrides: any = {}) {
  return {
    gold: '#FFD700', title: 'Title', body: 'Body', hasNeedsAttention: false, avgProgress: 0,
    styles: {}, navigation: { navigate: jest.fn() },
    ...overrides,
  };
}

describe('AISuggestedActionCard', () => {
  test('when students need attention, shows both Schedule and Assign buttons', async () => {
    await render(<AISuggestedActionCard {...baseProps({ hasNeedsAttention: true })} />);
    expect(screen.getByText('Schedule Study Hour')).toBeTruthy();
    expect(screen.getByText('Assign Practice Task')).toBeTruthy();
  });

  test('pressing Schedule Study Hour navigates to TeacherSchedule', async () => {
    const user = userEvent.setup();
    const navigation = { navigate: jest.fn() };
    await render(<AISuggestedActionCard {...baseProps({ hasNeedsAttention: true, navigation })} />);

    await user.press(screen.getByText('Schedule Study Hour'));

    expect(navigation.navigate).toHaveBeenCalledWith('TeacherSchedule');
  });

  test('pressing Assign Practice Task navigates to TeacherAssignments', async () => {
    const user = userEvent.setup();
    const navigation = { navigate: jest.fn() };
    await render(<AISuggestedActionCard {...baseProps({ hasNeedsAttention: true, navigation })} />);

    await user.press(screen.getByText('Assign Practice Task'));

    expect(navigation.navigate).toHaveBeenCalledWith('TeacherAssignments');
  });

  test('with no students needing attention and zero progress, shows "Create First Assignment"', async () => {
    await render(<AISuggestedActionCard {...baseProps({ hasNeedsAttention: false, avgProgress: 0 })} />);
    expect(screen.getByText('Create First Assignment')).toBeTruthy();
  });

  test('with no students needing attention but real progress, shows "Assign Task / Quiz"', async () => {
    await render(<AISuggestedActionCard {...baseProps({ hasNeedsAttention: false, avgProgress: 40 })} />);
    expect(screen.getByText('Assign Task / Quiz')).toBeTruthy();
  });

  test('pressing the single action button navigates to TeacherAssignments', async () => {
    const user = userEvent.setup();
    const navigation = { navigate: jest.fn() };
    await render(<AISuggestedActionCard {...baseProps({ hasNeedsAttention: false, avgProgress: 40, navigation })} />);

    await user.press(screen.getByText('Assign Task / Quiz'));

    expect(navigation.navigate).toHaveBeenCalledWith('TeacherAssignments');
  });
});
