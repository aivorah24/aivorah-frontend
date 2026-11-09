import { USE_LOCAL_SERVICES } from './localServices';

// Current Affairs backend base URL — the standalone
// aivorah-current-affairs-service (daily digest, weekly quiz, points/streaks).
// - Web local dev (EXPO_PUBLIC_USE_LOCAL_SERVICES=1): the service's local port.
//   3024, not 3015: 3015 is aivorah-assignments-service.
// - Everything else (web prod, native): the Render URL, same naming pattern as
//   every other aivorah-*-service. Not deployed yet.
const LIVE_SERVICE = 'https://aivorah-current-affairs-service.onrender.com';

// EXPO_PUBLIC_CURRENT_AFFAIRS_URL points only this service elsewhere (e.g. a preview deploy).
const CURRENT_AFFAIRS_SERVER_URL =
  process.env.EXPO_PUBLIC_CURRENT_AFFAIRS_URL || (USE_LOCAL_SERVICES ? 'http://localhost:3024' : LIVE_SERVICE);

export default CURRENT_AFFAIRS_SERVER_URL;
