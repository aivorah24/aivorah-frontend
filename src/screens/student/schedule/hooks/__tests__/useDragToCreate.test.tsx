import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, act } from '@testing-library/react-native';
import { useDragToCreate } from '../useDragToCreate';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

const mockOnQuickCreate = jest.fn();
const mockOnDragCreate = jest.fn();

function fakeMouseDownEvent(clientY: number) {
  return {
    button: 0,
    clientY,
    preventDefault: jest.fn(),
    currentTarget: { getBoundingClientRect: () => ({ top: 0 }) },
  };
}

function Harness() {
  const hook = useDragToCreate({ onQuickCreate: mockOnQuickCreate, onDragCreate: mockOnDragCreate });
  return (
    <>
      <Text testID="hasPreview">{String(!!hook.dragPreview)}</Text>
      <Text testID="previewStart">{hook.dragPreview?.startT ?? ''}</Text>
      <TouchableOpacity testID="mousedown0" onPress={() => hook.handleColMouseDown(fakeMouseDownEvent(0), '2026-04-15')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="mousedown-noleft" onPress={() => hook.handleColMouseDown({ ...fakeMouseDownEvent(0), button: 1 }, '2026-04-15')}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // The RN test environment has no real browser `window` (no addEventListener/
  // dispatchEvent) — the hook's mousemove/mouseup listeners need one.
  (global as any).window = new EventTarget();
});

describe('useDragToCreate', () => {
  test('a mousedown starts a drag preview at the computed time (rounded to 15 minutes)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('mousedown0'));
    expect(screen.getByTestId('hasPreview').props.children).toBe('true');
    expect(screen.getByTestId('previewStart').props.children).toBe('00:00');
  });

  test('a non-left mouse button never starts a drag', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('mousedown-noleft'));
    expect(screen.getByTestId('hasPreview').props.children).toBe('false');
  });

  test('dragging past the 15-minute threshold and releasing calls onDragCreate with real start/end times, then clears the preview', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('mousedown0')); // starts at y=0 -> 00:00

    // Simulate the real mousemove/mouseup the hook attaches to `window`.
    await act(async () => { window.dispatchEvent(Object.assign(new Event('mousemove'), { clientY: 100 })); });
    await act(async () => { window.dispatchEvent(Object.assign(new Event('mouseup'), { clientY: 100 })); });

    expect(mockOnDragCreate).toHaveBeenCalled();
    const [dayIso, startT, endT] = mockOnDragCreate.mock.calls[0];
    expect(dayIso).toBe('2026-04-15');
    expect(startT < endT).toBe(true);
    expect(screen.getByTestId('hasPreview').props.children).toBe('false');
  });

  test('releasing with less than 15 minutes of drag calls onQuickCreate instead of onDragCreate', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('mousedown0'));

    // A tiny drag (a few pixels) rounds to the same 15-minute slot -> treated as a click.
    await act(async () => { window.dispatchEvent(Object.assign(new Event('mouseup'), { clientY: 2 })); });

    expect(mockOnQuickCreate).toHaveBeenCalledWith('2026-04-15', '00:00');
    expect(mockOnDragCreate).not.toHaveBeenCalled();
  });
});
