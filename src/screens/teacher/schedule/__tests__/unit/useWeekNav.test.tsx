// Standalone unit test for useWeekNav — harness component pattern (see
// useTagFilters.test.tsx / useSubjects.test.tsx for precedent). Uses real
// timers throughout: the hook schedules setTimeout-based scroll calls
// against ref.current, which is fine to let fire since scroll refs are
// never attached to a real ScrollView here (calls are no-ops via optional
// chaining) — no need to fake/advance timers.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useWeekNav } from '../../hooks/useWeekNav';

function Harness() {
  const firstLoadDoneRef = React.useRef(false);
  const h = useWeekNav(firstLoadDoneRef);
  return (
    <View>
      <Text testID="todayISO">{h.todayISO}</Text>
      <Text testID="weekFirst">{h.week[0].iso}</Text>
      <Text testID="weekLast">{h.week[6].iso}</Text>
      <Text testID="colWidth">{String(h.colWidth)}</Text>
      <TouchableOpacity testID="prev-week" onPress={() => {
        const d = new Date(h.weekBase); d.setDate(d.getDate() - 7); h.setWeekBase(d);
      }} />
      <TouchableOpacity testID="next-week" onPress={() => {
        const d = new Date(h.weekBase); d.setDate(d.getDate() + 7); h.setWeekBase(d);
      }} />
      <TouchableOpacity testID="go-today" onPress={h.goToday} />
      <TouchableOpacity testID="grid-content-size-change" onPress={h.onGridContentSizeChange} />
    </View>
  );
}

describe('useWeekNav', () => {
  test('the initial week contains today (Mon-Sun)', async () => {
    await render(<Harness />);
    const todayISO = screen.getByTestId('todayISO').props.children;
    const first = screen.getByTestId('weekFirst').props.children;
    const last = screen.getByTestId('weekLast').props.children;
    expect(todayISO >= first && todayISO <= last).toBe(true);
  });

  test('colWidth is at least the DAY_COL_WIDTH minimum', async () => {
    await render(<Harness />);
    expect(Number(screen.getByTestId('colWidth').props.children)).toBeGreaterThanOrEqual(140);
  });

  test('next-week / prev-week move the visible week window', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const before = screen.getByTestId('weekFirst').props.children;
    await user.press(screen.getByTestId('next-week'));
    const afterNext = screen.getByTestId('weekFirst').props.children;
    expect(afterNext).not.toBe(before);
    await user.press(screen.getByTestId('prev-week'));
    await user.press(screen.getByTestId('prev-week'));
    const afterPrev = screen.getByTestId('weekFirst').props.children;
    expect(afterPrev).not.toBe(afterNext);
  });

  test('goToday navigates back to the current week after moving away', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const originalFirst = screen.getByTestId('weekFirst').props.children;
    await user.press(screen.getByTestId('next-week'));
    expect(screen.getByTestId('weekFirst').props.children).not.toBe(originalFirst);
    await user.press(screen.getByTestId('go-today'));
    expect(screen.getByTestId('weekFirst').props.children).toBe(originalFirst);
  });

  test('goToday is a no-op on week identity when already on the current week (no throw)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const before = screen.getByTestId('weekFirst').props.children;
    await user.press(screen.getByTestId('go-today'));
    expect(screen.getByTestId('weekFirst').props.children).toBe(before);
  });

  test('onGridContentSizeChange does not throw when the visible week includes today (first-load path)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('grid-content-size-change'));
    // No assertion beyond "did not throw" — this only drives ref.current
    // scroll calls, which are no-ops with no ScrollView attached.
    expect(screen.getByTestId('weekFirst')).toBeTruthy();
  });

  test('onGridContentSizeChange does not throw when the visible week does not include today', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('next-week'));
    await user.press(screen.getByTestId('grid-content-size-change'));
    expect(screen.getByTestId('weekFirst')).toBeTruthy();
  });
});
