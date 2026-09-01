import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../../context/AuthContext';
import * as parentProgressService from '../services/parentProgressService';
import type { ProgressData } from '../services/parentProgressService';

export function useParentProgress(route: any) {
  const { user } = useAuth();
  const parentEmail = user?.email || 'parent@demo.com';

  const [children, setChildren] = useState<any[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [weekly, setWeekly] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);
  const firstLoadDoneRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [practiceInsights, setPracticeInsights] = useState<any>(null);
  const [insightsGenerating, setInsightsGenerating] = useState(false);
  
  // Need to be very careful with useMemo on Animated.Value so they don't recreate constantly
  const insightAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  
  const child = children[selectedIdx];

  // 1. Load children
  useEffect(() => {
    let active = true;
    parentProgressService.fetchChildren(parentEmail)
      .then(data => {
        if (!active) return;
        setChildren(data);
        if (data.length > 0) {
          const targetChildId = route?.params?.childId;
          if (targetChildId) {
            const idx = data.findIndex(c => c.id === targetChildId);
            if (idx >= 0) setSelectedIdx(idx);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChildrenLoaded(true);
      });
    return () => { active = false; };
  }, [parentEmail, route?.params?.childId]);

  // 2. Handle empty children case
  useEffect(() => {
    if (childrenLoaded && children.length === 0) setLoading(false);
  }, [childrenLoaded, children.length]);

  // 3. Fetch data for current child
  const fetchData = async () => {
    if (!child) return;
    if (!firstLoadDoneRef.current) setLoading(true);
    
    try {
      const data: ProgressData = await parentProgressService.fetchProgressData(child);
      if (data.stats) setStats(data.stats);
      setWeekly(data.weekly);
      setPracticeInsights(data.practiceInsights);
    } catch { 
      // ignore
    } finally {
      if (!firstLoadDoneRef.current) {
        firstLoadDoneRef.current = true;
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [selectedIdx, children]);

  // 4. Polling & Focus Refresh
  useFocusEffect(
    useCallback(() => {
      let interval: ReturnType<typeof setInterval> | null = null;
      const refresh = () => {
        if (!child) return;
        fetchData();
        parentProgressService.fetchChildren(parentEmail)
          .then(data => {
            if (data.length > 0) {
              setChildren(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
            }
          })
          .catch(() => {});
      };
      const startPolling = () => { if (!interval) interval = setInterval(refresh, 30000); };
      const stopPolling = () => { if (interval) { clearInterval(interval); interval = null; } };
      
      refresh();
      startPolling();
      return () => stopPolling();
    }, [child, parentEmail])
  );

  // 5. Stagger animations when insights change
  useEffect(() => {
    if (!practiceInsights) return;
    insightAnims.forEach(a => a.setValue(0));
    setInsightsGenerating(true);
    const timer = setTimeout(() => {
      setInsightsGenerating(false);
      Animated.stagger(150, insightAnims.map(a =>
        Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true })
      )).start();
    }, 900);
    return () => clearTimeout(timer);
  }, [practiceInsights, insightAnims]);

  return {
    children,
    childrenLoaded,
    selectedIdx,
    setSelectedIdx,
    stats,
    weekly,
    loading,
    refreshing,
    setRefreshing,
    practiceInsights,
    insightsGenerating,
    insightAnims,
    child,
    fetchData,
  };
}
