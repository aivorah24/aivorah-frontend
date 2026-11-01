import { useEffect, useState } from 'react';
import PARENTAL_CONTROLS_SERVER_URL from '../../../../config/parentalControlsServerUrl';

const NONE: Set<string> = new Set();

// refreshKey: bump it (see useRefreshOnFocus) to re-check, so a parent's lock/unlock shows without a page reload.
export function useBlockedSubjects(email: string | undefined, refreshKey?: number) {
  // Locks are kept with the email they belong to, so a profile switch never shows the previous child's.
  const [state, setState] = useState<{ email?: string; subjects: Set<string> }>({ subjects: NONE });

  useEffect(() => {
    if (!email) return;
    let stale = false; // a newer check has started; a late reply must not overwrite it
    fetch(`${PARENTAL_CONTROLS_SERVER_URL}/parent/screen-time-status/${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (stale || !data || data.error) return; // keep the last known locks
        const filter = data.subjectFilter;
        const next: string[] = filter?.enabled && Array.isArray(filter.blockedSubjects) ? filter.blockedSubjects : [];
        setState((prev) =>
          prev.email === email && prev.subjects.size === next.length && next.every((s) => prev.subjects.has(s))
            ? prev
            : { email, subjects: new Set(next) },
        );
      })
      .catch(() => {});
    return () => { stale = true; };
  }, [email, refreshKey]);

  return state.email === email ? state.subjects : NONE;
}
