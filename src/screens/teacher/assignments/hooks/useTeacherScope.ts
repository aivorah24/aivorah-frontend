import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import { buildTeacherScope, TeachesEntry } from '../utils/teacherScope';

// The grades and subjects this teacher teaches (their saved teaches[]), for
// the Library filters. Re-read on focus so a change in Settings shows at once.
export function useTeacherScope(teacherEmail: string, cachedTeaches?: TeachesEntry[] | null) {
  const [teaches, setTeaches] = useState<TeachesEntry[] | null>(null);

  useFocusEffect(useCallback(() => {
    if (!teacherEmail) return;
    let alive = true;
    fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(teacherEmail)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (alive && Array.isArray(p?.teaches)) setTeaches(p.teaches); })
      .catch(() => {});
    return () => { alive = false; };
  }, [teacherEmail]));

  return useMemo(() => buildTeacherScope(teaches ?? cachedTeaches ?? []), [teaches, cachedTeaches]);
}
