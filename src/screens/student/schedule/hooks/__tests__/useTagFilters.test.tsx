import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useTagFilters } from '../useTagFilters';

function Harness({ event }: { event: { tag: string | null } }) {
  const hook = useTagFilters();
  return (
    <>
      <Text testID="passes">{String(hook.passesTagFilter(event as any))}</Text>
      <Text testID="allAssignmentOn">{String(hook.allAssignmentOn)}</Text>
      <Text testID="allEventOn">{String(hook.allEventOn)}</Text>
      <Text testID="hideCompleted">{String(hook.hideCompleted)}</Text>
      <TouchableOpacity testID="toggleWorksheet" onPress={() => hook.toggleAssignmentTag('Worksheet / Assignment')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleHolidays" onPress={() => hook.toggleEventTag('Holidays and vacations')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="turnOffAllAssignment" onPress={() => hook.toggleAllAssignment(false)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="turnOnAllAssignment" onPress={() => hook.toggleAllAssignment(true)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleHideCompleted" onPress={() => hook.setHideCompleted(v => !v)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

describe('useTagFilters', () => {
  test('all tags are enabled by default', async () => {
    await render(<Harness event={{ tag: null }} />);
    expect(screen.getByTestId('allAssignmentOn').props.children).toBe('true');
    expect(screen.getByTestId('allEventOn').props.children).toBe('true');
  });

  test('an event whose tag matches a known event tag passes when that tag is enabled', async () => {
    await render(<Harness event={{ tag: 'Holidays and vacations' }} />);
    expect(screen.getByTestId('passes').props.children).toBe('true');
  });

  test('disabling that specific event tag makes matching events fail the filter', async () => {
    const user = userEvent.setup();
    await render(<Harness event={{ tag: 'Holidays and vacations' }} />);
    await user.press(screen.getByTestId('toggleHolidays'));
    expect(screen.getByTestId('passes').props.children).toBe('false');
  });

  test('an event whose tag matches a known assignment tag passes when that tag is enabled', async () => {
    await render(<Harness event={{ tag: 'Worksheet / Assignment' }} />);
    expect(screen.getByTestId('passes').props.children).toBe('true');
  });

  test('disabling that specific assignment tag makes matching events fail the filter', async () => {
    const user = userEvent.setup();
    await render(<Harness event={{ tag: 'Worksheet / Assignment' }} />);
    await user.press(screen.getByTestId('toggleWorksheet'));
    expect(screen.getByTestId('passes').props.children).toBe('false');
  });

  test('an event with an unrecognized tag passes as long as any assignment tags remain enabled', async () => {
    await render(<Harness event={{ tag: 'Some Custom Tag' }} />);
    expect(screen.getByTestId('passes').props.children).toBe('true');
  });

  test('an event with an unrecognized tag fails once ALL assignment tags are turned off', async () => {
    const user = userEvent.setup();
    await render(<Harness event={{ tag: 'Some Custom Tag' }} />);
    await user.press(screen.getByTestId('turnOffAllAssignment'));
    expect(screen.getByTestId('passes').props.children).toBe('false');
    expect(screen.getByTestId('allAssignmentOn').props.children).toBe('false');
  });

  test('turning all assignment tags back on restores allAssignmentOn to true', async () => {
    const user = userEvent.setup();
    await render(<Harness event={{ tag: null }} />);
    await user.press(screen.getByTestId('turnOffAllAssignment'));
    await user.press(screen.getByTestId('turnOnAllAssignment'));
    expect(screen.getByTestId('allAssignmentOn').props.children).toBe('true');
  });

  test('hideCompleted toggles independently of tag state', async () => {
    const user = userEvent.setup();
    await render(<Harness event={{ tag: null }} />);
    await user.press(screen.getByTestId('toggleHideCompleted'));
    expect(screen.getByTestId('hideCompleted').props.children).toBe('true');
  });

  test('a null/empty tag is treated as an unrecognized assignment tag (passes while any assignment tag is on)', async () => {
    await render(<Harness event={{ tag: null }} />);
    expect(screen.getByTestId('passes').props.children).toBe('true');
  });
});
