import { useEffect, useRef } from 'react';

// B001/B002/B003 fix: the active LessonScreen's Read (Learn) and Listen tabs
// never recorded anything — no study time, no "in progress" signal — until a
// quiz was passed (completeLesson at >=60%). This hook wires meaningful
// activity start (content actually loaded, not just the tab being open while
// still loading) to StudentDataContext, mirroring the pattern already proven
// in the legacy VideoLessonScreen's session timer.
export interface LessonActivityDeps {
  startTopicActivity: (topic: string) => void;
  recordStudyTime: (mins: number, source?: 'learningPath' | 'assignment' | 'challenge' | 'other', subject?: string) => void;
}

export function useLessonActivityTracking(
  { topicName, subject, mode, contentReady, enabled }: {
    topicName: string | undefined;
    subject: string;
    mode: 'read' | 'listen' | 'practice' | 'ask';
    contentReady: boolean;
    enabled: boolean; // false for embedded/teacher-preview rendering
  },
  { startTopicActivity, recordStudyTime }: LessonActivityDeps
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

  // Credits whole minutes only while actually on Read or Listen with content
  // loaded — not while a spinner is showing, not on Practice/Ask (those have
  // their own signals: quiz completion, chat sends).
  const sessionStartRef = useRef<number | null>(null);
  const trackedMinutesRef = useRef(0);
  const isTracking = enabled && contentReady && (mode === 'read' || mode === 'listen');

  useEffect(() => {
    if (!isTracking) return;

    function flushWholeMinutes() {
      if (sessionStartRef.current == null) return;
      const elapsedWholeMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000);
      const delta = elapsedWholeMinutes - trackedMinutesRef.current;
      if (delta > 0) {
        recordStudyTime(delta, 'learningPath', subject);
        trackedMinutesRef.current += delta;
      }
    }

    sessionStartRef.current = Date.now();
    trackedMinutesRef.current = 0;
    const interval = setInterval(flushWholeMinutes, 15000);

    return () => {
      clearInterval(interval);
      flushWholeMinutes();
      sessionStartRef.current = null;
      trackedMinutesRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking, subject]);
}
