import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useWeekNavigation } from '../useWeekNavigation';

function Harness() {
  const hook = useWeekNavigation();
  return (
    <>
      <Text testID="weekFirstIso">{hook.week[0].iso}</Text>
      <Text testID="calYear">{hook.calYear}</Text>
      <Text testID="calMonth">{hook.calMonth}</Text>
      <TouchableOpacity testID="prevWeek" onPress={hook.prevWeek}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="nextWeek" onPress={hook.nextWeek}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="prevMonth" onPress={hook.prevMonth}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="nextMonth" onPress={hook.nextMonth}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="goToday" onPress={hook.goToday}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="selectDate" onPress={() => hook.selectDate(2026, 6, 10)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

describe('useWeekNavigation', () => {
  test('nextWeek advances the visible week by 7 real days', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const before = screen.getByTestId('weekFirstIso').props.children;

    await user.press(screen.getByTestId('nextWeek'));

    const afterDate = new Date(screen.getByTestId('weekFirstIso').props.children);
    const beforeDate = new Date(before);
    expect((afterDate.getTime() - beforeDate.getTime()) / 86400000).toBe(7);
  });

  test('prevWeek moves the visible week back by 7 real days', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const before = screen.getByTestId('weekFirstIso').props.children;

    await user.press(screen.getByTestId('prevWeek'));

    const afterDate = new Date(screen.getByTestId('weekFirstIso').props.children);
    const beforeDate = new Date(before);
    expect((beforeDate.getTime() - afterDate.getTime()) / 86400000).toBe(7);
  });

  test('nextMonth advances by one, wrapping December to January of the next year', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const startMonth = screen.getByTestId('calMonth').props.children as number;
    const startYear = screen.getByTestId('calYear').props.children as number;
    // Advance to December from wherever "now" actually is.
    const stepsToDecember = 12 - startMonth;
    for (let i = 0; i < stepsToDecember; i++) await user.press(screen.getByTestId('nextMonth'));
    expect(screen.getByTestId('calMonth').props.children).toBe(12);

    await user.press(screen.getByTestId('nextMonth')); // -> January, next year

    expect(screen.getByTestId('calMonth').props.children).toBe(1);
    expect(screen.getByTestId('calYear').props.children).toBe(startYear + 1);
  });

  test('prevMonth goes back by one, wrapping January back to December of the previous year', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const startMonth = screen.getByTestId('calMonth').props.children as number;
    const startYear = screen.getByTestId('calYear').props.children as number;
    // Go back to January from wherever "now" actually is.
    const stepsToJanuary = startMonth - 1;
    for (let i = 0; i < stepsToJanuary; i++) await user.press(screen.getByTestId('prevMonth'));
    expect(screen.getByTestId('calMonth').props.children).toBe(1);

    await user.press(screen.getByTestId('prevMonth')); // -> December, previous year

    expect(screen.getByTestId('calMonth').props.children).toBe(12);
    expect(screen.getByTestId('calYear').props.children).toBe(startYear - 1);
  });

  test('selectDate jumps the WEEK view to the chosen date, without touching the mini-calendar month/year', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const calMonthBefore = screen.getByTestId('calMonth').props.children;

    await user.press(screen.getByTestId('selectDate')); // June 10, 2026 (a Wednesday)

    // Monday of that week — allow either side of a UTC-conversion day rollover
    // (dateISO uses toISOString(), which shifts a local-midnight Date on
    // machines behind UTC), so assert the real day-of-week invariant instead
    // of a single hardcoded date.
    const iso = screen.getByTestId('weekFirstIso').props.children as string;
    expect(['2026-06-08', '2026-06-07']).toContain(iso);
    expect(screen.getByTestId('calMonth').props.children).toBe(calMonthBefore); // unaffected
  });

  test('goToday resets the visible week back to the real current date', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('selectDate')); // jump away to June 2026
    await user.press(screen.getByTestId('goToday'));

    const now = new Date();
    expect(screen.getByTestId('calYear').props.children).toBe(now.getFullYear());
    expect(screen.getByTestId('calMonth').props.children).toBe(now.getMonth() + 1);
  });
});
