import { useState, useCallback } from 'react';
import { Overview, AccessRequest } from '../types';
import { fetchOverview, fetchAccessRequests, actionAccessRequest } from '../services/schoolAdminDashboardService';

export function useSchoolAdminDashboardData(userEmail: string | undefined | null) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError('');

    try {
      const overviewData = await fetchOverview(userEmail);
      setOverview(overviewData);
    } catch (err: any) {
      console.error('Error loading school admin dashboard:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail]);

  const loadRequests = useCallback(async () => {
    if (!userEmail) return;
    try {
      const requestsData = await fetchAccessRequests(userEmail);
      setAccessRequests(requestsData);
    } catch (err) {
      // silent — the panel just stays empty
    }
  }, [userEmail]);

  const actionRequest = useCallback(
    async (
      id: string,
      action: 'approve' | 'reject',
      onSuccess?: () => void
    ) => {
      if (!userEmail) return;
      setActioningId(id);
      try {
        await actionAccessRequest(id, action, userEmail);
        setAccessRequests((prev) => prev.filter((r) => r.id !== id));
        if (onSuccess) onSuccess();
        if (action === 'approve') load(); // refresh counts (a new member joined)
      } catch {
        // ignore — row stays, admin can retry
      } finally {
        setActioningId(null);
      }
    },
    [userEmail, load]
  );

  return {
    overview,
    loading,
    refreshing,
    setRefreshing,
    error,
    accessRequests,
    actioningId,
    load,
    loadRequests,
    actionRequest,
  };
}
