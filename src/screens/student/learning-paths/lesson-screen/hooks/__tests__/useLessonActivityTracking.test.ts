import { renderHook, act } from '@testing-library/react-native';
import { useLessonActivityTracking } from '../useLessonActivityTracking';

// B001/B002/B003 regression coverage: the active LessonScreen's Learn/Listen
// tabs previously called neither startTopicActivity nor recordStudyTime at
// all (the root cause confirmed by the RCA) — these tests pin the fix.
describe('useLessonActivityTracking', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function deps() {
    return { startTopicActivity: jest.fn(), recordStudyTime: jest.fn() };
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

  test('B001: credits whole minutes of study time while on Read, without double-counting', async () => {
    const d = deps();
    await renderHook(() => useLessonActivityTracking(
      { topicName: 'Fractions', subject: 'Math', mode: 'read', contentReady: true, enabled: true }, d
    ));

    await act(async () => { jest.advanceTimersByTime(60000); }); // 1 minute
    expect(d.recordStudyTime).toHaveBeenCalledTimes(1);
    expect(d.recordStudyTime).toHaveBeenCalledWith(1, 'learningPath', 'Math');

    await act(async () => { jest.advanceTimersByTime(60000); }); // another minute
    expect(d.recordStudyTime).toHaveBeenCalledTimes(2);
    expect(d.recordStudyTime).toHaveBeenNthCalledWith(2, 1, 'learningPath', 'Math');

    // Total credited across both flushes is 2 minutes, not re-sent as 1+2=3
    // (the classic double-counting bug the RCA explicitly called out).
    const totalCredited = d.recordStudyTime.mock.calls.reduce((sum: number, c: any[]) => sum + c[0], 0);
    expect(totalCredited).toBe(2);
  });

  test('flushes any remaining partial minute on unmount', async () => {
    const d = deps();
    const { unmount } = await renderHook(() => useLessonActivityTracking(
      { topicName: 'Fractions', subject: 'Math', mode: 'listen', contentReady: true, enabled: true }, d
    ));
    await act(async () => { jest.advanceTimersByTime(90000); }); // 1.5 minutes -> 1 whole minute flushed by interval
    expect(d.recordStudyTime).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(45000); }); // another 45s -> total 2m15s, no new interval tick yet
    unmount();
    // Unmount flush should credit the 2nd whole minute that accrued since the last tick.
    expect(d.recordStudyTime).toHaveBeenCalledTimes(2);
  });
});
