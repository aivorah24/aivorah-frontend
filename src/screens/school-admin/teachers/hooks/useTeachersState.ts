import { useCallback, useState } from 'react';
import { schoolAdminTeachersService, TeacherRow } from '../services/schoolAdminTeachersService';

export function useTeachersState(email: string | undefined) {
  const [items, setItems] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!email) return;
    setError('');
    try {
      const data = await schoolAdminTeachersService.getTeachers(email);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [email]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { items, loading, refreshing, error, load, refresh };
}
