import { renderHook, act } from '@testing-library/react-native';
import { useLessonActivityTracking } from '../useLessonActivityTracking';

// B001/B002/B003 regression coverage: the active LessonScreen's Learn/Listen
// tabs previously called neither startTopicActivity nor recordStudySeconds at
// all (the root cause confirmed by the RCA) — these tests pin the fix.
describe('useLessonActivityTracking', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function deps() {
    return { startTopicActivity: jest.fn(), recordStudySeconds: jest.fn() };
  }

  test('B002: marks the topic started exactly once when Read content is ready', async () => {
    const d = deps();
    const { rerender } = await renderHook(
      (props: any) => useLessonActivityTracking(props, d),
      { initialProps: { topicName: 'Fractions', subject: 'Math', mode: 'read' as const, contentReady: true, enabled: true } }
    );
    expect(d.startTopicActivity).toHaveBeenCalledTimes(1);
    expect(d.startTopicActivity).toHaveBeenCalledWith('Fractions');

    // Re-rendering with the same topic/mode must NOT double-count (no
    // duplicate "started" calls for the same topic while still on it).
    await act(async () => {
      rerender({ topicName: 'Fractions', subject: 'Math', mode: 'read' as const, contentReady: true, enabled: true });
    });
    expect(d.startTopicActivity).toHaveBeenCalledTimes(1);
  });

  test('does not mark started while content is still loading (not "meaningful activity" yet)', async () => {
    const d = deps();
    await renderHook(() => useLessonActivityTracking(
      { topicName: 'Fractions', subject: 'Math', mode: 'read', contentReady: false, enabled: true }, d
    ));
    expect(d.startTopicActivity).not.toHaveBeenCalled();
  });

  test('does not track activity when embedded (teacher preview), enabled=false', async () => {
    const d = deps();
    await renderHook(() => useLessonActivityTracking(
      { topicName: 'Fractions', subject: 'Math', mode: 'read', contentReady: true, enabled: false }, d
    ));
    expect(d.startTopicActivity).not.toHaveBeenCalled();
  });

  test('Practice/Ask tabs do not mark the topic started (only Read/Listen are tracked)', async () => {
    const d = deps();
    await renderHook(() => useLessonActivityTracking(
      { topicName: 'Fractions', subject: 'Math', mode: 'practice', contentReady: true, enabled: true }, d
    ));
    expect(d.startTopicActivity).not.toHaveBeenCalled();
  });

  test('B001: credits seconds while on Read every 15s tick, without double-counting', async () => {
    const d = deps();
    await renderHook(() => useLessonActivityTracking(
      { topicName: 'Fractions', subject: 'Math', mode: 'read', contentReady: true, enabled: true }, d
    ));

    await act(async () => { jest.advanceTimersByTime(15000); });
    expect(d.recordStudySeconds).toHaveBeenCalledWith(15, 'learningPath', 'Math');

    await act(async () => { jest.advanceTimersByTime(105000); }); // total 2 minutes
    // Each tick sends only the new delta, so the sum is 120s, not cumulative re-sends.
    const total = d.recordStudySeconds.mock.calls.reduce((sum: number, c: any[]) => sum + c[0], 0);
    expect(total).toBe(120);
    expect(d.recordStudySeconds.mock.calls.every((c: any[]) => c[0] === 15)).toBe(true);
  });

  test('a session shorter than a minute is still credited on unmount (was lost to whole-minute flooring)', async () => {
    const d = deps();
    const { unmount } = await renderHook(() => useLessonActivityTracking(
      { topicName: 'Fractions', subject: 'Math', mode: 'listen', contentReady: true, enabled: true }, d
    ));
    await act(async () => { jest.advanceTimersByTime(40000); }); // 2 ticks = 30s, +10s pending
    await unmount();
    const total = d.recordStudySeconds.mock.calls.reduce((sum: number, c: any[]) => sum + c[0], 0);
    expect(total).toBe(40);
  });
});
