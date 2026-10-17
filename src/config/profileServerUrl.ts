import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Profile microservice base URL (aivorah-profile-service) — student + parent
// profile. Deployed live on Render; web dev uses the local service port.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-profile-service.onrender.com';

const PROFILE_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:4002' : LIVE_SERVICE;

export default PROFILE_SERVER_URL;
