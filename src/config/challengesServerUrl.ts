import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Challenges microservice base URL (aivorah-challenges-service). Deployed
// live on Render; web dev uses the local service port.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-challenges-service.onrender.com';

const CHALLENGES_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:3008' : LIVE_SERVICE;

export default CHALLENGES_SERVER_URL;
