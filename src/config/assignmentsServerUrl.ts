import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Assignments backend base URL — routed to the standalone
// aivorah-assignments-service microservice instead of the monolith.
// Serves the 6 student-facing /assignments/* endpoints this covers.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_ASSIGNMENTS_BACKEND = 'https://aivorah-assignments-service.onrender.com';

// EXPO_PUBLIC_ASSIGNMENTS_URL points only this service elsewhere (e.g. a local copy).
const ASSIGNMENTS_SERVER_URL =
  process.env.EXPO_PUBLIC_ASSIGNMENTS_URL || (USE_LOCAL_SERVICES ? 'http://localhost:3015' : LIVE_ASSIGNMENTS_BACKEND);

export default ASSIGNMENTS_SERVER_URL;
