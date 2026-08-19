import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import FilterBar from '../FilterBar';

const colors = { accentYellow: '#fa0', textMuted: '#888', borderColor: '#333' } as any;

describe('FilterBar', () => {
  test('pressing a filter chip calls setFilterType with the real key', async () => {
    const setFilterType = jest.fn();
    const user = userEvent.setup();
    await render(<FilterBar filterType="all" setFilterType={setFilterType} hideCompleted={false} setHideCompleted={() => {}} styles={{}} colors={colors} />);

    await user.press(screen.getByTestId('schedule-filter-assignments'));

    expect(setFilterType).toHaveBeenCalledWith('assignments');
  });

  test('the active filter is marked selected via accessibilityState', async () => {
    await render(<FilterBar filterType="study" setFilterType={() => {}} hideCompleted={false} setHideCompleted={() => {}} styles={{}} colors={colors} />);
    expect(screen.getByTestId('schedule-filter-study').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('schedule-filter-all').props.accessibilityState.selected).toBe(false);
  });

  test('pressing "Hide Completed" toggles the real boolean', async () => {
    const setHideCompleted = jest.fn();
    const user = userEvent.setup();
    await render(<FilterBar filterType="all" setFilterType={() => {}} hideCompleted={false} setHideCompleted={setHideCompleted} styles={{}} colors={colors} />);

    await user.press(screen.getByTestId('schedule-hide-completed'));

    expect(setHideCompleted).toHaveBeenCalledWith(true);
  });

  test('hideCompleted checkbox reflects real checked state', async () => {
    await render(<FilterBar filterType="all" setFilterType={() => {}} hideCompleted={true} setHideCompleted={() => {}} styles={{}} colors={colors} />);
    expect(screen.getByTestId('schedule-hide-completed').props.accessibilityState.checked).toBe(true);
  });
});
