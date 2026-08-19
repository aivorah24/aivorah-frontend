import { Platform } from 'react-native';

// "The World & You" backend base URL — routed to the standalone
// aivorah-world-and-you-service microservice, deployed live on Render.
// - Web (local dev): the microservice's local port.
// - Everything else (web prod, native): the live Render URL.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-world-and-you-service.onrender.com';

const WORLD_AND_YOU_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3010' : LIVE_SERVICE;

export default WORLD_AND_YOU_SERVER_URL;
