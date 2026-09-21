import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchImportHistory } from '../services/importHistoryService';
import type { ImportRun } from '../types';

export function useImportHistory(adminEmail: string | undefined) {
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ImportRun | null>(null);

  const load = useCallback(async () => {
    if (!adminEmail) return;
    setError('');
    try {
      const data = await fetchImportHistory(adminEmail);
      setRuns(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load import history. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [adminEmail]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const retry = useCallback(() => { setLoading(true); load(); }, [load]);

  return { runs, loading, error, selected, setSelected, retry };
}
