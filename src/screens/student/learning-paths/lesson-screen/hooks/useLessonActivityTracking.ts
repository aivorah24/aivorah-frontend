import { useEffect, useRef } from 'react';

// B001/B002/B003 fix: the active LessonScreen's Read (Learn) and Listen tabs
// never recorded anything — no study time, no "in progress" signal — until a
// quiz was passed (completeLesson at >=60%). This hook wires meaningful
// activity start (content actually loaded, not just the tab being open while
// still loading) to StudentDataContext, mirroring the pattern already proven
// in the legacy VideoLessonScreen's session timer.
export interface LessonActivityDeps {
  startTopicActivity: (topic: string) => void;
  recordStudySeconds: (seconds: number, source?: 'learningPath' | 'assignment' | 'challenge' | 'other', subject?: string) => void;
}

export function useLessonActivityTracking(
  { topicName, subject, mode, contentReady, enabled }: {
    topicName: string | undefined;
    subject: string;
    mode: 'read' | 'listen' | 'practice' | 'ask';
    contentReady: boolean;
    enabled: boolean; // false for embedded/teacher-preview rendering
  },
  { startTopicActivity, recordStudySeconds }: LessonActivityDeps
) {
  // Marks the topic "In Progress" exactly once per topic per mount of this
  // provider's session (startTopicActivity itself guards against repeat
  // XP/explore-count once a topic is already started or completed).
  useEffect(() => {
    if (!enabled || !contentReady || !topicName) return;
    if (mode !== 'read' && mode !== 'listen') return;
    startTopicActivity(topicName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, contentReady, topicName, mode]);

  // Counts time only while on Read or Listen with content loaded — not while a
  // spinner is showing, not on Practice/Ask (those have their own signals).
  const sessionStartRef = useRef<number | null>(null);
  const trackedSecondsRef = useRef(0);
  const isTracking = enabled && contentReady && (mode === 'read' || mode === 'listen');

  useEffect(() => {
    if (!isTracking) return;

    function flush() {
      if (sessionStartRef.current == null) return;
      const elapsedSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const delta = elapsedSeconds - trackedSecondsRef.current;
      if (delta > 0) {
        recordStudySeconds(delta, 'learningPath', subject);
        trackedSecondsRef.current += delta;
      }
    }

    sessionStartRef.current = Date.now();
    trackedSecondsRef.current = 0;
    const interval = setInterval(flush, 15000);

    return () => {
      clearInterval(interval);
      flush();
      sessionStartRef.current = null;
      trackedSecondsRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking, subject]);
}
