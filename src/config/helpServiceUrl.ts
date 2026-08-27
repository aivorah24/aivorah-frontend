import { Platform } from 'react-native';

// Help Center microservice base URL (aivorah-help-center-service), deployed
// live on Render.
// - Web (local dev): local help-center microservice.
// - Everything else: the live Render URL.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-help-center-service.onrender.com';

const HELP_SERVICE_URL =
   LIVE_SERVICE;

export default HELP_SERVICE_URL;
