import { useEffect, useState } from 'react';
import PARENTAL_CONTROLS_SERVER_URL from '../../../../config/parentalControlsServerUrl';

export function useBlockedSubjects(email: string | undefined) {
  const [blockedSubjects, setBlockedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!email) return;
    fetch(`${PARENTAL_CONTROLS_SERVER_URL}/parent/screen-time-status/${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.subjectFilter?.enabled && Array.isArray(data.subjectFilter.blockedSubjects)) {
          setBlockedSubjects(new Set(data.subjectFilter.blockedSubjects));
        }
      })
      .catch(() => {});
  }, [email]);

  return blockedSubjects;
}
