import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import StudentOverviewCard from '../../components/StudentOverviewCard';

const COLORS: any = { accentGreen: '#0f0', accentRed: '#f00' };

function baseProps(overrides: any = {}) {
  return {
    colors: COLORS, gold: '#FFD700', totalStudents: 5, activeToday: 2, needsAttentionCount: 1,
    recentStudents: [], styles: {}, navigation: { navigate: jest.fn() },
    ...overrides,
  };
}

describe('StudentOverviewCard', () => {
  test('empty recentStudents shows "No recent activity"', async () => {
    await render(<StudentOverviewCard {...baseProps()} />);
    expect(screen.getByText('No recent activity')).toBeTruthy();
  });

  test('renders multiple real recent activity items with bold title and prefix/suffix', async () => {
    const recentStudents = [
      { id: '1', name: 'Aarav', icon: 'book', time: '5m ago', prefix: 'Completed ', title: 'Fractions', suffix: '', studentId: 's1' },
      { id: '2', name: 'Bela', icon: 'award', time: '10m ago', prefix: 'Completed ', title: 'Decimals', suffix: '', studentId: 's2' },
    ];
    await render(<StudentOverviewCard {...baseProps({ recentStudents })} />);
    expect(screen.getByText('Aarav')).toBeTruthy();
    expect(screen.getByText('Fractions')).toBeTruthy();
    expect(screen.getByText('5m ago')).toBeTruthy();
    expect(screen.getByText('Bela')).toBeTruthy();
  });

  test('pressing the card navigates to Students', async () => {
    const user = userEvent.setup();
    const navigation = { navigate: jest.fn() };
    await render(<StudentOverviewCard {...baseProps({ navigation })} />);

    await user.press(screen.getByText('Student Overview'));

    expect(navigation.navigate).toHaveBeenCalledWith('TeacherStudents');
  });

  test('pressing Active Today navigates with the Active Today filter, without also triggering the card press', async () => {
    const user = userEvent.setup();
    const navigation = { navigate: jest.fn() };
    await render(<StudentOverviewCard {...baseProps({ navigation })} />);

    await user.press(screen.getByText('Active Today'));

    expect(navigation.navigate).toHaveBeenCalledWith('TeacherStudents', { initialTab: 'Active Today' });
    expect(navigation.navigate).toHaveBeenCalledTimes(1); // stopPropagation prevented a second (card-level) call
  });

  test('pressing Need Attention navigates with the Needs Attention filter', async () => {
    const user = userEvent.setup();
    const navigation = { navigate: jest.fn() };
    await render(<StudentOverviewCard {...baseProps({ navigation })} />);

    await user.press(screen.getByText('Need Attention'));

    expect(navigation.navigate).toHaveBeenCalledWith('TeacherStudents', { initialTab: 'Needs Attention' });
  });

  test('pressing a recent activity row navigates to that student\'s Progress', async () => {
    const user = userEvent.setup();
    const navigation = { navigate: jest.fn() };
    const recentStudents = [{ id: '1', name: 'Aarav', icon: 'book', time: '5m ago', action: 'Completed a topic', studentId: 's1' }];
    await render(<StudentOverviewCard {...baseProps({ navigation, recentStudents })} />);

    await user.press(screen.getByText('Aarav'));

    expect(navigation.navigate).toHaveBeenCalledWith('TeacherProgress', { studentId: 's1' });
  });
});
