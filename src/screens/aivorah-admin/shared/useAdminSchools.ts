import { useCallback, useEffect, useState } from 'react';
import { fetchAdminSchools } from '../map-to-teacher/services/mapToTeacherService';
import type { AdminSchool } from '../map-to-teacher/types';

export function useAdminSchools() {
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSchools(await fetchAdminSchools());
    } catch (e: any) {
      setError(e?.message || 'Could not load schools.');
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
  useEffect(() => { reload(); }, [reload]);

  // Placeholder text for a school dropdown in each state.
  const placeholder = loading ? 'Loading schools…' : error ? "Couldn't load schools" : schools.length ? 'Select a school' : 'No schools yet';
  return { schools, loading, error, reload, placeholder };
}
