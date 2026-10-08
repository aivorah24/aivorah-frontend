import { Platform } from 'react-native';

// Platform Admin microservice (aivorah-platform-admin-service) — the
// signed-in replacement for the monolith's static /admin/panel.html.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-platform-admin-service.onrender.com';

const PLATFORM_ADMIN_SERVER_URL =
  false ? 'http://localhost:3023' : LIVE_SERVICE;

export default PLATFORM_ADMIN_SERVER_URL;
