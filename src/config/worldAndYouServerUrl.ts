import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// "The World & You" backend base URL — routed to the standalone
// aivorah-world-and-you-service microservice, deployed live on Render.
// - Web (local dev): the microservice's local port.
// - Everything else (web prod, native): the live Render URL.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-world-and-you-service.onrender.com';

const WORLD_AND_YOU_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:3010' : LIVE_SERVICE;

export default WORLD_AND_YOU_SERVER_URL;
