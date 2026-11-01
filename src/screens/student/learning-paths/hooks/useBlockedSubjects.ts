import { useEffect, useState } from 'react';
import PARENTAL_CONTROLS_SERVER_URL from '../../../../config/parentalControlsServerUrl';

// refreshKey: bump it (see useRefreshOnFocus) to re-check, so a parent's lock/unlock shows without a page reload.
export function useBlockedSubjects(email: string | undefined, refreshKey?: number) {
  const [blockedSubjects, setBlockedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!email) return;
    fetch(`${PARENTAL_CONTROLS_SERVER_URL}/parent/screen-time-status/${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data || data.error) return; // keep the last known locks
        const filter = data.subjectFilter;
        const next: string[] = filter?.enabled && Array.isArray(filter.blockedSubjects) ? filter.blockedSubjects : [];
        setBlockedSubjects((prev) => (prev.size === next.length && next.every((s) => prev.has(s)) ? prev : new Set(next)));
      })
      .catch(() => {});
  }, [email, refreshKey]);

  return blockedSubjects;
}
