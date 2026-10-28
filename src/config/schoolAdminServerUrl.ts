import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// School Admin microservice base URL (aivorah-school-admin-service) —
// Grades & Sections console routes. Deployed live on Render; web dev uses
// the local service port (default 3018, see aivorah-school-admin-service/index.js).
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-school-admin-service-w0xk.onrender.com';

// EXPO_PUBLIC_SCHOOL_ADMIN_URL points only this service elsewhere (e.g. a local copy).
const SCHOOL_ADMIN_SERVER_URL =
  process.env.EXPO_PUBLIC_SCHOOL_ADMIN_URL || (USE_LOCAL_SERVICES ? 'http://localhost:3018' : LIVE_SERVICE);

export default SCHOOL_ADMIN_SERVER_URL;
