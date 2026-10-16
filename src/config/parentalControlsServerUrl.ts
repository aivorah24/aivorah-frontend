import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Parental Controls microservice (aivorah-parental-controls-service) -
// screen-time limits/weekly cap/allowed hours/break enforcer/subject filter,
// extracted from the ai-mentor monolith's routes/parent.js (2026-09-03).
// Web dev uses the local service port; everything else uses the live
// deployment.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-parental-controls-service-okqy.onrender.com';

// EXPO_PUBLIC_PARENTAL_CONTROLS_URL points only this service elsewhere (e.g. a local copy).
const OVERRIDE = process.env.EXPO_PUBLIC_PARENTAL_CONTROLS_URL;

const PARENTAL_CONTROLS_SERVER_URL =
  OVERRIDE || (USE_LOCAL_SERVICES ? 'http://localhost:3018' : LIVE_SERVICE);

export default PARENTAL_CONTROLS_SERVER_URL;
