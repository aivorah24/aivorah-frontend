import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persisted to AsyncStorage under the SAME key/keys the notification bell
// reads (notifPrefs_<email>: assignmentAlerts / teacherMessages /
// challengeUpdates). Previously these toggles only changed local state, so
// turning "Parent Messages" off had no effect and the bell still notified.
export function useNotificationPreferences(email: string | undefined, triggerPoll: () => void) {
  const NOTIF_KEY = `notifPrefs_${email ?? 'guest'}`;
  const [submissionAlerts, setSubmissionAlerts] = useState(true);   // assignmentAlerts
  const [parentMessages, setParentMessages] = useState(true);       // teacherMessages
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [aiInsights, setAiInsights] = useState(true);
  const [challengeAlerts, setChallengeAlerts] = useState(false);    // challengeUpdates

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then(raw => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw);
        if (p.assignmentAlerts != null) setSubmissionAlerts(p.assignmentAlerts);
        if (p.teacherMessages != null) setParentMessages(p.teacherMessages);
        if (p.challengeUpdates != null) setChallengeAlerts(p.challengeUpdates);
        if (p.weeklyReport != null) setWeeklyReport(p.weeklyReport);
        if (p.aiInsights != null) setAiInsights(p.aiInsights);
      } catch {}
    }).catch(() => {});
  }, [NOTIF_KEY]);

  // Persist all current notification prefs (mapping teacher labels -> bell
  // keys) and poll immediately so the change takes effect without waiting
  // for the next cycle.
  const saveNotifPrefs = useCallback((override: Record<string, boolean>) => {
    const prefs = {
      assignmentAlerts: submissionAlerts,
      teacherMessages: parentMessages,
      challengeUpdates: challengeAlerts,
      weeklyReport,
      aiInsights,
      ...override,
    };
    AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)).catch(() => {});
    triggerPoll();
  }, [NOTIF_KEY, submissionAlerts, parentMessages, challengeAlerts, weeklyReport, aiInsights, triggerPoll]);

  return {
    submissionAlerts, setSubmissionAlerts,
    parentMessages, setParentMessages,
    weeklyReport, setWeeklyReport,
    aiInsights, setAiInsights,
    challengeAlerts, setChallengeAlerts,
    saveNotifPrefs,
  };
}
