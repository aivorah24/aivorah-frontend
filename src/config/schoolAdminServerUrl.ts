import { Platform } from 'react-native';

// School Admin microservice base URL (aivorah-school-admin-service) —
// Grades & Sections console routes. Deployed live on Render; web dev uses
// the local service port (default 3018, see aivorah-school-admin-service/index.js).
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-school-admin-service.onrender.com';

const SCHOOL_ADMIN_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3018' : LIVE_SERVICE;

export default SCHOOL_ADMIN_SERVER_URL;
