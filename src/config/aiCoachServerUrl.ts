import { Platform } from 'react-native';

// AI Coach microservice base URL (aivorah-ai-coach-service). Deployed live on
// Render; web dev uses the local service port.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-ai-coach-service.onrender.com';

const AI_COACH_SERVER_URL =
   LIVE_SERVICE;

export default AI_COACH_SERVER_URL;
