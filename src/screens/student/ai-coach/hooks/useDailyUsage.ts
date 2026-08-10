import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';

export function useDailyUsage(email: string | undefined, isPro: boolean) {
  const [dailyUsage, setDailyUsage] = useState<{ used: number; remaining: number; dailyLimit: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (isPro || !email) return;
    fetch(`${SERVER_URL}/ask/usage?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.unlimited) {
          setDailyUsage({ used: data.used, remaining: data.remaining, dailyLimit: data.dailyLimit });
          if (data.remaining <= 0) setLimitReached(true);
        }
      })
      .catch(() => {});
  }, [email, isPro]);

  return { dailyUsage, setDailyUsage, limitReached, setLimitReached };
}
