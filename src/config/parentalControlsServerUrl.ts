import { Platform } from 'react-native';

// Parental Controls microservice (aivorah-parental-controls-service) -
// screen-time limits/weekly cap/allowed hours/break enforcer/subject filter,
// extracted from the ai-mentor monolith's routes/parent.js (2026-09-03).
// Web dev uses the local service port; everything else uses the live
// deployment.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-parental-controls-service.onrender.com';

const PARENTAL_CONTROLS_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3018' : LIVE_SERVICE;

export default PARENTAL_CONTROLS_SERVER_URL;
