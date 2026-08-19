import { Platform } from 'react-native';

// Auth microservice base URL (aivorah-auth-service) — /user/sync, /user/role,
// /user/send-verification, /user/verify/:token, /user/check-verified,
// /user/send-password-reset. Deployed live on Render; web dev uses the local
// service port (default 4001, see aivorah-auth-service/index.js).
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-auth-service.onrender.com';

const AUTH_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:4001' : LIVE_SERVICE;

export default AUTH_SERVER_URL;
