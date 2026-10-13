import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationPrefs } from '../types';

const DEFAULTS: NotificationPrefs = {
  assignmentAlerts: true,
  teacherMessages: true,
  weeklyReport: true,
  progressNudges: true,
  challengeUpdates: true,
};

export function useNotificationPrefs(email: string | undefined) {
  const key = `notifPrefs_${email ?? 'guest'}`;
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (!raw) return;
      try {
        setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
      } catch {}
    }).catch(() => {});
  }, [key]);

  // Resolves once the bell's key is written, so a poll after it sees the new value.
  const setPref = useCallback(async (field: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
    try {
      const raw = await AsyncStorage.getItem(key);
      const stored = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(key, JSON.stringify({ ...stored, [field]: value }));
    } catch {}
  }, [key]);

  return { prefs, setPref };
}
