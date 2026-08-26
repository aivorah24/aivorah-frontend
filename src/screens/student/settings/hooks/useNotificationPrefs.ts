import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';

export function useNotificationPrefs(userEmail: string | undefined, triggerPoll: () => void, clearUnreadAssignments: () => void, clearUnreadChallenges: () => void, muteCategory: (key: 'assignmentAlerts' | 'challengeUpdates') => void, setRecoverySaved: (v: string) => void) {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [assignmentAlerts, setAssignmentAlerts] = useState(true);
  const [challengeUpdates, setChallengeUpdates] = useState(true);
  const notifLoaded = useRef(false);

  // Load saved preferences from server on mount
  useEffect(() => {
    if (!userEmail) return;
    fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.ok ? r.json() : null)
      .then(prefs => {
        if (!prefs) return;
        if (prefs.pushNotifications !== undefined) setPushNotifications(prefs.pushNotifications);
        if (prefs.aiSuggestions !== undefined) setAiSuggestions(prefs.aiSuggestions);
        if (prefs.weeklyReport !== undefined) setWeeklyReport(prefs.weeklyReport);
        if (prefs.assignmentAlerts !== undefined) setAssignmentAlerts(prefs.assignmentAlerts);
        if (prefs.challengeUpdates !== undefined) setChallengeUpdates(prefs.challengeUpdates);
        if (prefs.recoveryEmail) setRecoverySaved(prefs.recoveryEmail);
        notifLoaded.current = true;
      }).catch(() => { notifLoaded.current = true; });
    // Bell prefs live in AsyncStorage — load them so the toggles reflect what the
    // notification bell actually uses (these win over the server copy for gating).
    AsyncStorage.getItem(`notifPrefs_${userEmail}`).then(raw => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw);
        if (p.assignmentAlerts !== undefined) setAssignmentAlerts(p.assignmentAlerts);
        if (p.challengeUpdates !== undefined) setChallengeUpdates(p.challengeUpdates);
      } catch {}
    }).catch(() => {});
  }, [userEmail]);

  // Save notification preference to server whenever it changes (after initial load)
  function saveNotifPref(key: string, value: boolean) {
    if (!userEmail) return;
    // Persist to the server profile…
    if (notifLoaded.current) {
      fetch(`${PROFILE_SERVER_URL}/user/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, [key]: value }),
      }).catch(() => {});
    }
    // …AND to the AsyncStorage key the notification bell reads, then poll so the
    // toggle actually turns bell notifications on/off (same as parent settings).
    (async () => {
      try {
        const NK = `notifPrefs_${userEmail}`;
        const raw = await AsyncStorage.getItem(NK);
        const prefs = raw ? JSON.parse(raw) : {};
        prefs[key] = value;
        await AsyncStorage.setItem(NK, JSON.stringify(prefs));
        triggerPoll();
      } catch {}
    })();
  }

  function toggleAssignmentAlerts(v: boolean) {
    setAssignmentAlerts(v);
    saveNotifPref('assignmentAlerts', v);
    // Turning ON dismisses the backlog that piled up while OFF, so those
    // notifications don't replay — only new ones appear.
    if (v) clearUnreadAssignments();
    if (!v) muteCategory('assignmentAlerts');
  }

  function toggleChallengeUpdates(v: boolean) {
    setChallengeUpdates(v);
    saveNotifPref('challengeUpdates', v);
    if (v) clearUnreadChallenges();
    if (!v) muteCategory('challengeUpdates');
  }

  return {
    pushNotifications, aiSuggestions, weeklyReport,
    assignmentAlerts, challengeUpdates,
    toggleAssignmentAlerts, toggleChallengeUpdates,
  };
}
