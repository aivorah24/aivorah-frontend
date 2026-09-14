import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { syncUser, fetchChildrenActivity } from '../services/parentProfileService';

export function useParentProfileData(email: string, parentEmail: string) {
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [children, setChildren] = useState<any[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const loadProfile = useCallback(() => {
    if (!email) return;
    syncUser(email)
      .then(d => {
        if (d?.phone) setPhone(d.phone);
        if (d?.location) setCity(d.location);
      })
      .catch(() => {});
  }, [email]);

  // Refresh on focus, not just mount - otherwise a location/phone change made
  // on another screen (e.g. Settings) never shows here if this screen stayed
  // mounted in the background, same reasoning as loadActivity below.
  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const loadActivity = useCallback(() => {
    fetchChildrenActivity(parentEmail)
      .then(({ children, weeklyActivity }) => {
        setChildren(children);
        setWeeklyActivity(weeklyActivity);
      })
      .catch(() => {})
      .finally(() => setChildrenLoading(false));
  }, [parentEmail]);

  // Initial load + auto-refresh every 15s (study time is logged each minute
  // server-side), so the parent never has to manually refresh.
  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 15 * 1000);
    return () => clearInterval(interval);
  }, [loadActivity]);

  // Refresh instantly when the screen regains focus.
  useFocusEffect(useCallback(() => { loadActivity(); }, [loadActivity]));

  return { phone, setPhone, city, setCity, children, childrenLoading, weeklyActivity };
}
