import React, { useEffect } from 'react';
import { render, act } from '@testing-library/react-native';
import { useScheduleScroll } from '../useScheduleScroll';

const scrollTo = jest.fn();

function Probe({ ready, onApi, pinnedHeader = false }: { ready: boolean; onApi: (api: any) => void; pinnedHeader?: boolean }) {
  const api = useScheduleScroll({ ready, allDayHeight: 36, hourHeight: 56, pinnedHeader });
  // Stand-in for the ScrollView the screen attaches.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { (api.scrollRef as any).current = { scrollTo }; onApi(api); });
  return null;
}

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 8, 30, 18, 30)); scrollTo.mockReset(); });
afterEach(() => jest.useRealTimers());

test('opens at an hour before now, below the headers above the grid', async () => {
  let api: any;
  const { rerender } = await render(<Probe ready={false} onApi={(a) => { api = a; }} />);
  await act(async () => { api.onGridLayout({ nativeEvent: { layout: { y: 120 } } }); jest.runAllTimers(); });
  expect(scrollTo).not.toHaveBeenCalled();

  await rerender(<Probe ready onApi={(a) => { api = a; }} />);
  await act(async () => { jest.runAllTimers(); });
  // 120 (above the grid) + 62 (day headers) + 36 (all day) + 17.5 h × 56
  expect(scrollTo).toHaveBeenCalledWith({ y: 120 + 62 + 36 + 17.5 * 56, animated: false });
});

test('only opens once; the Today button scrolls to now again, smoothly', async () => {
  let api: any;
  await render(<Probe ready onApi={(a) => { api = a; }} />);
  await act(async () => { api.onGridLayout({ nativeEvent: { layout: { y: 0 } } }); jest.runAllTimers(); });
  await act(async () => { api.onGridLayout({ nativeEvent: { layout: { y: 0 } } }); jest.runAllTimers(); });
  expect(scrollTo).toHaveBeenCalledTimes(1);
  await act(async () => { api.scrollToNow(); });
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 62 + 36 + 17.5 * 56, animated: true });
});

test('with the date row pinned on top, the hours scroll up to just under it', async () => {
  let api: any;
  await render(<Probe ready pinnedHeader onApi={(a) => { api = a; }} />);
  await act(async () => { api.onGridLayout({ nativeEvent: { layout: { y: 120 } } }); jest.runAllTimers(); });
  expect(scrollTo).toHaveBeenCalledWith({ y: 120 + 17.5 * 56, animated: false });
});
