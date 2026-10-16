import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Help Center microservice base URL (aivorah-help-center-service), deployed
// live on Render.
// - Web (local dev): local help-center microservice.
// - Everything else: the live Render URL.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-help-center-service.onrender.com';

const HELP_SERVICE_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:3013' : LIVE_SERVICE;

export default HELP_SERVICE_URL;
