import { Platform } from 'react-native';

// Assignments backend base URL — routed to the standalone
// aivorah-assignments-service microservice instead of the monolith.
// Serves the 6 student-facing /assignments/* endpoints this covers.
declare const __DEV__: boolean;

const LIVE_ASSIGNMENTS_BACKEND = 'https://aivorah-assignments-service.onrender.com';

const ASSIGNMENTS_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3015' : LIVE_ASSIGNMENTS_BACKEND;

export default ASSIGNMENTS_SERVER_URL;
