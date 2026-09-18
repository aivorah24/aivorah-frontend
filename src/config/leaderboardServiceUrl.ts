import { Platform } from 'react-native';

// Leaderboard microservice base URL (aivorah-leaderboard-service), deployed
// live on Render.
// - Web (local dev): local leaderboard microservice.
// - Everything else: the live Render URL.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-leaderboard-service-0nou.onrender.com';

const LEADERBOARD_SERVICE_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:4003' : LIVE_SERVICE;

export default LEADERBOARD_SERVICE_URL;
