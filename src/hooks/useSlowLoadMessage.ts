import { useEffect, useState } from 'react';

// Several backends run on Render's free tier, which sleeps after 15 min
// idle and can take 30-50s to wake on the next request. A bare spinner
// during that wait looks identical to a frozen/broken screen. After
// `delayMs` of still-loading, flip on a message explaining the wait
// instead of leaving the user staring at nothing.
export function useSlowLoadMessage(loading: boolean, delayMs = 4000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when loading finishes
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(t);
  }, [loading, delayMs]);

  return slow;
}
