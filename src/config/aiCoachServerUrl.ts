import { Platform } from 'react-native';

// AI Coach microservice base URL (aivorah-ai-coach-service). Deployed live on
// Render; web dev uses the local service port.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-ai-coach-service-7ikx.onrender.com';

const AI_COACH_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3007' : LIVE_SERVICE;

export default AI_COACH_SERVER_URL;
