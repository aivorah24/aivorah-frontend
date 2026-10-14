import { Platform } from 'react-native';
import { USE_LOCAL_SERVICES } from './localServices';

// Backend base URL.
// - Web (production): the LIVE backend. The frontend now deploys standalone
//   on Vercel (no longer served from the same origin as the Express
//   monolith), so this can no longer be '' (same-origin) — that resolved to
//   the Vercel static host itself and silently 404'd/405'd every call.
// - Web (local dev):  local Express server.
// - Native (phone):   the LIVE backend, so Expo Go previews and shared APK builds
//   work anywhere without being on the same Wi-Fi as the dev machine.
//   (To test the mobile app against your LOCAL server instead, replace the native
//    value with your computer's LAN IP, e.g. 'http://10.104.63.1:3006', and keep
//    the phone on the same Wi-Fi with the server running.)
declare const __DEV__: boolean;

const LIVE_BACKEND = 'https://aivorah.ai';

const SERVER_URL =
  Platform.OS === 'web'
    ? (USE_LOCAL_SERVICES ? 'http://localhost:3007' : LIVE_BACKEND)
    : LIVE_BACKEND;

export default SERVER_URL;
