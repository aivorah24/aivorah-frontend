// Integration test: useWeekNav + useTagFilters wired to the real
// CalendarGrid component (as TeacherScheduleScreen wires them).
//
// ── HARNESS LIMITATION (Category D, same as TeacherScheduleScreen.e2e.test.tsx) ──
// CalendarGrid renders each populated event as a raw HTML `<div>` (for its
// custom mouse-drag code to work under a real DOM) — under RN's test
// renderer here, any host text child not wrapped in `<Text>` throws
// "Text strings must be rendered within a <Text> component" and crashes the
// render. So this file only exercises CalendarGrid with an EMPTY eventsMap
// (grid structure, day headers, hour-slot press, all-day column press) —
// the same scope boundary already documented for the E2E safety-net file.
// Event-tile-specific behavior (drag, delete, tap-to-open-detail, tag
// filtering hiding a tile) is accepted as untestable in this harness.
import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import CalendarGrid from '../../components/CalendarGrid';
import { useWeekNav } from '../../hooks/useWeekNav';
import { useTagFilters } from '../../hooks/useTagFilters';
import { makeStyles } from '../../styles';
import { darkColors } from '../../../../../theme';
import { TIMES, HOUR_HEIGHT } from '../../constants';
import { dateISO } from '../../utils/scheduleUtils';
import type { ScheduleEvent } from '../../types';

function Harness({ openModal = jest.fn(), setSelectedEvent = jest.fn(), removeEvent = jest.fn(), eventsMap = {}, onDayHeaderPress }: any) {
  const firstLoadDoneRef = React.useRef(false);
  const week = useWeekNav(firstLoadDoneRef);
  const tagFilters = useTagFilters(eventsMap, week.week);
  const styles = makeStyles(darkColors as any);
  const gridHeight = TIMES.length * HOUR_HEIGHT;

  return (
    <CalendarGrid
      colors={darkColors as any}
      gold={darkColors.accentYellow}
      styles={styles}
      week={week.week}
      todayISO={week.todayISO}
      eventsMap={eventsMap}
      passesTagFilter={tagFilters.passesTagFilter}
      allDayHeight={tagFilters.allDayHeight}
      colWidth={week.colWidth}
      gridHeight={gridHeight}
      // Same pre-existing RefObject<ScrollView|null> vs RefObject<ScrollView>
      // mismatch as TeacherScheduleScreen.tsx itself (see CLAUDE.md) — the
      // real screen passes this ref the same way; cast matches that.
      hScrollRef={week.hScrollRef as React.RefObject<any>}
      onGridContentSizeChange={week.onGridContentSizeChange}
      nowTime={new Date()}
      students={[]}
      dragPreviewTeacher={null}
      makeOnMouseDown={() => () => {}}
      startDrag={() => {}}
      wasDragRef={{ current: false }}
      removeEvent={removeEvent}
      openModal={openModal}
      setSelectedEvent={setSelectedEvent}
      onDayHeaderPress={onDayHeaderPress}
    />
  );
}

describe('CalendarGrid + useWeekNav/useTagFilters integration', () => {
  test('renders a day column and all-day column for every day of the week', async () => {
    await render(<Harness />);
    // Just assert 7 day-header cells rendered via testIDs on day/allday columns.
    const dayCols = screen.root!.queryAll((node: any) => typeof node.props?.testID === 'string' && node.props.testID.startsWith('teacher-schedule-day-col-'));
    expect(dayCols.length).toBe(7);
    const allDayCols = screen.root!.queryAll((node: any) => typeof node.props?.testID === 'string' && node.props.testID.startsWith('teacher-schedule-allday-col-'));
    expect(allDayCols.length).toBe(7);
  });

  test('pressing an hour slot on a day calls openModal with that day/time', async () => {
    const openModal = jest.fn();
    const user = userEvent.setup();
    await render(<Harness openModal={openModal} />);
    const dayCols = screen.root!.queryAll((node: any) => typeof node.props?.testID === 'string' && node.props.testID.startsWith('teacher-schedule-day-col-'));
    const firstDayIso = dayCols[0].props.testID.replace('teacher-schedule-day-col-', '');
    const slot = screen.getByTestId(`teacher-schedule-slot-${firstDayIso}-09:00`);
    await user.press(slot);
    expect(openModal).toHaveBeenCalledWith(firstDayIso, '09:00');
  });

  test('pressing the all-day column for a day opens the modal preset as an all-day Holiday event', async () => {
    const openModal = jest.fn();
    const user = userEvent.setup();
    await render(<Harness openModal={openModal} />);
    const allDayCols = screen.root!.queryAll((node: any) => typeof node.props?.testID === 'string' && node.props.testID.startsWith('teacher-schedule-allday-col-'));
    const firstIso = allDayCols[0].props.testID.replace('teacher-schedule-allday-col-', '');
    await user.press(screen.getByTestId(`teacher-schedule-allday-col-${firstIso}`));
    expect(openModal).toHaveBeenCalledWith(firstIso, undefined, true, 'Holidays and vacations');
  });

  test('today\'s column header renders distinctly (no crash) alongside the others', async () => {
    await render(<Harness />);
    // GMT label is always shown once as the fixed time-column header.
    expect(screen.getByText('GMT+05:30')).toBeTruthy();
    expect(screen.getByText('All day')).toBeTruthy();
  });

  // Regression test for Bug #19's "tap-date doesn't scroll" — the day
  // header used to be a plain View (not tappable at all). Now a
  // TouchableOpacity that calls onDayHeaderPress(iso).
  test('tapping a day header calls onDayHeaderPress with that day\'s iso date (Bug #19)', async () => {
    const onDayHeaderPress = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onDayHeaderPress={onDayHeaderPress} />);
    const headers = screen.root!.queryAll((node: any) => typeof node.props?.testID === 'string' && node.props.testID.startsWith('teacher-schedule-day-header-'));
    expect(headers.length).toBe(7);
    const firstIso = headers[0].props.testID.replace('teacher-schedule-day-header-', '');
    await user.press(screen.getByTestId(`teacher-schedule-day-header-${firstIso}`));
    expect(onDayHeaderPress).toHaveBeenCalledWith(firstIso);
  });

  // Bug #19: the week grid changed from Monday-first to Sunday-first.
  test('the week grid starts on Sunday, not Monday (Bug #19)', async () => {
    await render(<Harness />);
    const headers = screen.root!.queryAll((node: any) => typeof node.props?.testID === 'string' && node.props.testID.startsWith('teacher-schedule-day-header-'));
    const firstIso = headers[0].props.testID.replace('teacher-schedule-day-header-', '');
    const lastIso = headers[6].props.testID.replace('teacher-schedule-day-header-', '');
    expect(new Date(firstIso + 'T00:00:00').getDay()).toBe(0); // Sunday
    expect(new Date(lastIso + 'T00:00:00').getDay()).toBe(6);  // Saturday
  });

  test('an all-day event renders as a chip in its day\'s all-day lane and is tappable', async () => {
    const todayISO = dateISO(new Date());
    const allDayEvent: ScheduleEvent = {
      id: 'holiday1', title: 'Founders Day', date: todayISO, startTime: '23:59', endTime: '23:59',
      type: 'break', note: '', studentId: 'all', createdBy: 'teacher', tag: 'Holidays and vacations',
    };
    const setSelectedEvent = jest.fn();
    const user = userEvent.setup();
    await render(<Harness eventsMap={{ [todayISO]: [allDayEvent] }} setSelectedEvent={setSelectedEvent} />);

    expect(screen.getByText('Founders Day')).toBeTruthy();
    await user.press(screen.getByText('Founders Day'));
    expect(setSelectedEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 'holiday1' }));
  });
});
