import { Platform } from 'react-native';

// Assignments backend base URL — routed to the standalone
// aivorah-assignments-service microservice instead of the monolith.
// Serves the 6 student-facing /assignments/* endpoints this covers.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_ASSIGNMENTS_BACKEND = 'https://aivorah-assignments-service-qd20.onrender.com';

const ASSIGNMENTS_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3015' : LIVE_ASSIGNMENTS_BACKEND;

export default ASSIGNMENTS_SERVER_URL;
