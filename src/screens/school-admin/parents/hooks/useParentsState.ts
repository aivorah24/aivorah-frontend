import { useCallback, useState } from 'react';
import { schoolAdminParentsService, ParentRow } from '../services/schoolAdminParentsService';

export function useParentsState(email: string | undefined) {
  const [items, setItems] = useState<ParentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedParent, setSelectedParent] = useState<ParentRow | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    setError('');
    try {
      const data = await schoolAdminParentsService.getParents(email);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load parents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [email]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { items, loading, refreshing, error, selectedParent, setSelectedParent, load, refresh };
}
