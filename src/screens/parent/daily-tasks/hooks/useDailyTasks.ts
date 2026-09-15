import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as dailyTasksService from '../services/dailyTasksService';

const POLL_INTERVAL_MS = 10 * 1000;

export function useDailyTasks(parentEmail: string) {
  const [children, setChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedChild, setSelectedChild] = useState<any>(null);

  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchChildren = useCallback(async () => {
    try {
      const list = await dailyTasksService.fetchChildren(parentEmail);
      setChildren(list);
      setSelectedChild((prev: any) => prev ?? (list.length > 0 ? list[0] : null));
    } catch {
      // best-effort; keep previous state on failure
    } finally {
      setLoadingChildren(false);
      setRefreshing(false);
    }
  }, [parentEmail]);

  const fetchTasks = useCallback(async (child: any, silent = false) => {
    if (!child?.id) return;
    if (!silent) setLoadingTasks(true);
    try {
      setTasks(await dailyTasksService.fetchTasks(child.id));
    } catch {
      // best-effort; keep previous tasks on failure
    } finally {
      if (!silent) setLoadingTasks(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the initial async fetch, not derivable from render-time values
  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  // Load the selected child's tasks + auto-refresh every 10s (silent, no
  // spinner) so the student's completions show up here without a manual refresh.
  useEffect(() => {
    if (!selectedChild) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- triggers a fetch for the newly selected child
    fetchTasks(selectedChild);
    const interval = setInterval(() => fetchTasks(selectedChild, true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedChild, fetchTasks]);

  useFocusEffect(useCallback(() => {
    if (selectedChild) fetchTasks(selectedChild, true);
  }, [selectedChild, fetchTasks]));

  async function addTask(label: string, icon: string, coins: string) {
    if (!label.trim()) { setError('Please enter a task description.'); return false; }
    if (!selectedChild?.id) { setError('Select a child first.'); return false; }
    setSaving(true); setError('');
    try {
      const newTask = await dailyTasksService.createTask({
        parentEmail,
        childId: selectedChild.id,
        childName: selectedChild.name,
        grade: selectedChild.grade,
        curriculum: selectedChild.curriculum,
        label: label.trim(),
        icon,
        coins: parseInt(coins, 10) || 5,
      });
      setTasks(prev => [newTask, ...prev]);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Network error. Check server is running.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeTask(taskId: string) {
    const prevTasks = tasks;
    setTasks(prev => prev.filter(t => t.id !== taskId)); // optimistic
    try {
      await dailyTasksService.deleteTask(taskId);
    } catch {
      setTasks(prevTasks); // revert on error
    }
  }

  function onRefresh() {
    setRefreshing(true);
    fetchChildren();
    if (selectedChild) fetchTasks(selectedChild);
  }

  return {
    children, loadingChildren, selectedChild, setSelectedChild,
    tasks, loadingTasks,
    saving, error, setError,
    refreshing, onRefresh,
    addTask, removeTask,
  };
}
