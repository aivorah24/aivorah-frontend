import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import WeekNavBar from '../WeekNavBar';

const colors = { textMuted: '#888' } as any;
const week = [
  { iso: '2026-04-13', day: 'MON', date: 13 }, { iso: '2026-04-14', day: 'TUE', date: 14 },
  { iso: '2026-04-15', day: 'WED', date: 15 }, { iso: '2026-04-16', day: 'THU', date: 16 },
  { iso: '2026-04-17', day: 'FRI', date: 17 }, { iso: '2026-04-18', day: 'SAT', date: 18 },
  { iso: '2026-04-19', day: 'SUN', date: 19 },
];

describe('WeekNavBar', () => {
  test('renders the real week range label from the first and last day', async () => {
    await render(<WeekNavBar week={week} onPrevWeek={() => {}} onNextWeek={() => {}} onToday={() => {}} styles={{}} colors={colors} />);
    expect(screen.getByTestId('schedule-week-label').props.children).toEqual(['MON', ' ', 13, ' — ', 'SUN', ' ', 19]);
  });

  test('pressing prev/next/today calls the real handlers', async () => {
    const onPrevWeek = jest.fn(); const onNextWeek = jest.fn(); const onToday = jest.fn();
    const user = userEvent.setup();
    await render(<WeekNavBar week={week} onPrevWeek={onPrevWeek} onNextWeek={onNextWeek} onToday={onToday} styles={{}} colors={colors} />);

    await user.press(screen.getByTestId('schedule-prev-week'));
    await user.press(screen.getByTestId('schedule-next-week'));
    await user.press(screen.getByTestId('schedule-today-button'));

    expect(onPrevWeek).toHaveBeenCalled();
    expect(onNextWeek).toHaveBeenCalled();
    expect(onToday).toHaveBeenCalled();
  });
});
