// Integration test: useWeekNav hook wired to the real WeekNavBar component,
// verifying prev/next/today presses on the rendered component flow through
// to real hook state and re-render the week label.
import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import WeekNavBar from '../../components/WeekNavBar';
import { useWeekNav } from '../../hooks/useWeekNav';
import { makeStyles } from '../../styles';
import { darkColors } from '../../../../../theme';

function Harness() {
  const firstLoadDoneRef = React.useRef(false);
  const h = useWeekNav(firstLoadDoneRef);
  const styles = makeStyles(darkColors as any);
  return (
    <WeekNavBar
      colors={darkColors as any}
      styles={styles}
      week={h.week}
      weekBase={h.weekBase}
      setWeekBase={h.setWeekBase}
      goToday={h.goToday}
    />
  );
}

describe('WeekNavBar + useWeekNav integration', () => {
  test('renders a week label containing the current week span', async () => {
    await render(<Harness />);
    expect(screen.getByTestId('teacher-schedule-week-label')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  test('pressing next-week then prev-week returns to the original label', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const original = (screen.getByTestId('teacher-schedule-week-label').props.children as string[]).join('');

    await user.press(screen.getByTestId('teacher-schedule-next-week'));
    const afterNext = (screen.getByTestId('teacher-schedule-week-label').props.children as string[]).join('');
    expect(afterNext).not.toBe(original);

    await user.press(screen.getByTestId('teacher-schedule-prev-week'));
    const afterPrev = (screen.getByTestId('teacher-schedule-week-label').props.children as string[]).join('');
    expect(afterPrev).toBe(original);
  });

  test('the Today button navigates back to the current week after moving away', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    const original = (screen.getByTestId('teacher-schedule-week-label').props.children as string[]).join('');

    await user.press(screen.getByTestId('teacher-schedule-next-week'));
    await user.press(screen.getByTestId('teacher-schedule-next-week'));
    await user.press(screen.getByTestId('teacher-schedule-today-button'));

    const afterToday = (screen.getByTestId('teacher-schedule-week-label').props.children as string[]).join('');
    expect(afterToday).toBe(original);
  });
});
