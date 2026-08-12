import { Platform } from 'react-native';

// Help Center microservice base URL (aivorah-help-center-service).
// - Web (production): '' → same-origin, until the service is deployed and proxied.
// - Web (local dev):  local help-center microservice.
// - Native (phone):   falls back to the LIVE backend's /help route
//   (not yet migrated there) until the service is deployed.
declare const __DEV__: boolean;

const LIVE_BACKEND = 'https://aivorah.ai';

const HELP_SERVICE_URL =
  Platform.OS === 'web'
    ? (__DEV__ ? 'http://localhost:3013' : '')
    : LIVE_BACKEND;

export default HELP_SERVICE_URL;
