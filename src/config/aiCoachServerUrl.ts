import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// AI Coach microservice base URL (aivorah-ai-coach-service). Deployed live on
// Render; web dev uses the local service port.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-ai-coach-service.onrender.com';

const AI_COACH_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:3007' : LIVE_SERVICE;

export default AI_COACH_SERVER_URL;
