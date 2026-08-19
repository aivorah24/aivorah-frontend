import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';

export function useBlockedSubjects(email: string | undefined) {
  const [blockedSubjects, setBlockedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!email) return;
    fetch(`${SERVER_URL}/parent/screen-time-status/${encodeURIComponent(email)}`)
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
