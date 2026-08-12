import { Platform } from 'react-native';

// Schedule microservice base URL (aivorah-schedule-service). Deployed live on
// Render; web dev uses the local service port.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-schedule-service.onrender.com';

const SCHEDULE_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3009' : LIVE_SERVICE;

export default SCHEDULE_SERVER_URL;
