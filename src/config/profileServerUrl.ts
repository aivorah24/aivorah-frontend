import { Platform } from 'react-native';

// Profile microservice base URL (aivorah-profile-service) — student + parent
// profile. Deployed live on Render; web dev uses the local service port.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-profile-service.onrender.com';

const PROFILE_SERVER_URL =
   LIVE_SERVICE;

export default PROFILE_SERVER_URL;
