import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Auth microservice base URL (aivorah-auth-service) — /user/sync, /user/role,
// /user/send-verification, /user/verify/:token, /user/check-verified,
// /user/send-password-reset. Deployed live on Render; web dev uses the local
// service port (default 4001, see aivorah-auth-service/index.js).
//
// 2026-09-18: migrated to a new Render account (aivorah-auth-service.onrender.com's
// account got suspended for billing). Temporary URL until the account's custom
// domain/naming is sorted out — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

export const LIVE_SERVICE = 'https://aivorah-auth-service.onrender.com';

const AUTH_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:4001' : LIVE_SERVICE;

export default AUTH_SERVER_URL;
