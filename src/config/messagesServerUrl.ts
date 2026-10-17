import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Messages backend base URL — routed to the standalone
// aivorah-messages-service microservice instead of the monolith.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_MESSAGES_BACKEND = 'https://aivorah-messages-service.onrender.com';

const MESSAGES_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:3020' : LIVE_MESSAGES_BACKEND;

export default MESSAGES_SERVER_URL;
