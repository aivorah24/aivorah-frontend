import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchChildren, fetchScreenTime, saveScreenTime } from '../services/parentControlsService';
import { DEFAULT_LIMITS } from '../constants';
import type { Child, Controls } from '../types';

const DEFAULT_CONTROLS: Controls = {
  isEnabled: false, dailyLimitMinutes: 60, lockWhenReached: false, todayUsageMinutes: 0, weeklyUsageMinutes: 0,
  weeklyCapEnabled: false, weeklyCapMinutes: 300,
  allowedHoursEnabled: false, allowedHoursStart: 14, allowedHoursEnd: 21,
  breakEnforcerEnabled: false, breakIntervalMinutes: 25, breakDurationMinutes: 5,
  homeworkFirstEnabled: false,
  subjectFilterEnabled: false, blockedSubjects: [],
};

export function useParentControlsData(parentEmail: string, onSaved: () => void) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ctrl, setCtrl] = useState<Controls>(DEFAULT_CONTROLS);
  const [error, setError] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);
  const skipAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSettingsRef = useRef<() => void>(() => {});

  const set = (fields: Partial<Controls>) => {
    // A real user edit always wins over a still-in-flight initial GET - if
    // that fetch resolves AFTER this point, it must not overwrite what the
    // user just set (see the isInitial guard in fetchControls below; this is
    // the other half of that fix - a slow-but-legitimate single response,
    // no StrictMode duplication needed, can resolve after the user has
    // already toggled+saved, confirmed via a live network-log capture
    // 2026-09-03).
    isInitialLoadRef.current = false;
    setCtrl(prev => ({ ...prev, ...fields }));
  };

  useEffect(() => {
    if (!parentEmail) return;
    fetchChildren(parentEmail)
      .then(kids => {
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [parentEmail]);

  const fetchControls = useCallback((isInitial = false) => {
    if (!selectedChild || !parentEmail) return;
    if (isInitial) setLoading(true);
    fetchScreenTime(parentEmail, selectedChild.id)
      .then(data => {
        // React StrictMode (dev only) double-invokes the mount effect that
        // triggers this call with isInitial=true, firing two GETs. If the
        // second one resolves AFTER the first has already applied its data
        // AND the user has since toggled+saved a real change, this branch
        // used to unconditionally overwrite that live state back to
        // whatever the (now stale) initial GET returned - which then
        // re-triggered the auto-save effect and wrote the STALE value back
        // to the server too (confirmed via a live network-log capture,
        // 2026-09-03). Ignore a second isInitial resolution once the first
        // has already landed.
        if (isInitial && !isInitialLoadRef.current) return;
        if (isInitial) {
          setCtrl({
            isEnabled: data.isEnabled ?? false,
            dailyLimitMinutes: data.dailyLimitMinutes ?? DEFAULT_LIMITS[selectedChild.grade] ?? 60,
            lockWhenReached: data.lockWhenReached ?? false,
            todayUsageMinutes: data.todayUsageMinutes ?? 0,
            weeklyUsageMinutes: data.weeklyUsageMinutes ?? 0,
            weeklyCapEnabled: data.weeklyCapEnabled ?? false,
            weeklyCapMinutes: data.weeklyCapMinutes ?? 300,
            allowedHoursEnabled: data.allowedHoursEnabled ?? false,
            allowedHoursStart: data.allowedHoursStart ?? 14,
            allowedHoursEnd: data.allowedHoursEnd ?? 21,
            breakEnforcerEnabled: data.breakEnforcerEnabled ?? false,
            breakIntervalMinutes: data.breakIntervalMinutes ?? 25,
            breakDurationMinutes: data.breakDurationMinutes ?? 5,
            homeworkFirstEnabled: data.homeworkFirstEnabled ?? false,
            subjectFilterEnabled: data.subjectFilterEnabled ?? false,
            blockedSubjects: data.blockedSubjects ?? [],
          });
        } else {
          // Only refresh usage - don't overwrite unsaved settings changes
          skipAutoSaveRef.current = true;
          setCtrl(prev => ({ ...prev, todayUsageMinutes: data.todayUsageMinutes ?? prev.todayUsageMinutes, weeklyUsageMinutes: data.weeklyUsageMinutes ?? prev.weeklyUsageMinutes }));
        }
        if (isInitial) { setLoading(false); isInitialLoadRef.current = false; setError(null); }
      })
      .catch(() => {
        if (isInitial) {
          setLoading(false);
          isInitialLoadRef.current = false;
          setError("Couldn't load this child's current settings. Changes may not save — please try again later.");
        }
      });
  }, [selectedChild, parentEmail]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the initial + polling fetch, not derivable from render-time values
    fetchControls(true);
    const interval = setInterval(() => fetchControls(false), 15 * 1000);
    return () => clearInterval(interval);
  }, [fetchControls]);

  // Auto-save whenever controls change (debounced 800ms), skip initial load and usage-only polls.
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (skipAutoSaveRef.current) { skipAutoSaveRef.current = false; return; }
    if (!selectedChild || !parentEmail) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { saveSettingsRef.current(); }, 800);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrl]);

  // Refresh usage immediately whenever the screen regains focus.
  useFocusEffect(useCallback(() => { fetchControls(false); }, [fetchControls]));

  const saveSettings = useCallback(async () => {
    if (!selectedChild || !parentEmail) return null;
    setSaving(true);
    let failure: string | null = null;
    try {
      const data = await saveScreenTime(parentEmail, selectedChild.id, ctrl);
      if (data.success) onSaved();
      else failure = data.error || 'Failed to save';
    } catch {
      failure = 'Could not save settings. Please try again.';
    } finally {
      setSaving(false);
    }
    setError(failure);
    return failure;
  }, [selectedChild, parentEmail, ctrl, onSaved]);
  useEffect(() => { saveSettingsRef.current = saveSettings; }, [saveSettings]);

  return { children, selectedChild, setSelectedChild, loading, saving, ctrl, set, saveSettings, error };
}
