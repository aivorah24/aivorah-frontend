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

  const setPref = useCallback((field: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [field]: value };
      AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [key]);

  return { prefs, setPref };
}
