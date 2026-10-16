import { Platform } from 'react-native';
import { USE_LOCAL_SERVICES } from './localServices';

// Platform Admin microservice (aivorah-platform-admin-service) — the
// signed-in replacement for the monolith's static /admin/panel.html.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-platform-admin-service-vaeu.onrender.com';

// EXPO_PUBLIC_PLATFORM_ADMIN_URL points only the admin screens elsewhere (e.g. a
// locally running service) while every other service stays on live.
const OVERRIDE = process.env.EXPO_PUBLIC_PLATFORM_ADMIN_URL;

const PLATFORM_ADMIN_SERVER_URL =
  OVERRIDE || (USE_LOCAL_SERVICES ? 'http://localhost:3023' : LIVE_SERVICE);

export default PLATFORM_ADMIN_SERVER_URL;
