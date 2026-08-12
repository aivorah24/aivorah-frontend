import { Platform } from 'react-native';

// Daily Habits backend base URL — routed to the standalone
// aivorah-daily-habits-service microservice, deployed live on Render.
// - Web (local dev): the microservice's local port.
// - Everything else (web prod, native): the live Render URL.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-daily-habits-service.onrender.com';

const DAILY_HABITS_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3012' : LIVE_SERVICE;

export default DAILY_HABITS_SERVER_URL;
