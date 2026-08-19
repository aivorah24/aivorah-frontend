import { Platform } from 'react-native';

// Challenges microservice base URL (aivorah-challenges-service). Deployed
// live on Render; web dev uses the local service port.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-challenges-service.onrender.com';

const CHALLENGES_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3008' : LIVE_SERVICE;

export default CHALLENGES_SERVER_URL;
