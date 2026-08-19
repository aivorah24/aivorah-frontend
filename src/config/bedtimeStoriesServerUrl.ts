import { Platform } from 'react-native';

// Bedtime Stories backend base URL — routed to the standalone
// aivorah-bedtime-stories-service microservice, deployed live on Render.
// - Web (local dev): the microservice's local port.
// - Everything else (web prod, native): the live Render URL.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-bedtime-stories-service.onrender.com';

const BEDTIME_STORIES_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3011' : LIVE_SERVICE;

export default BEDTIME_STORIES_SERVER_URL;
