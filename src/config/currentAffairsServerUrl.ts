import { USE_LOCAL_SERVICES } from './localServices';

// Current Affairs backend base URL (daily digest, weekly quiz, points/streaks).
// The API is hosted inside aivorah-attendance-service under /current-affairs
// until aivorah-current-affairs-service has its own Render service — so the
// live URL and local port (3022) are the attendance service's.
// When it moves, change LIVE_SERVICE (local port then 3024).
const LIVE_SERVICE = 'https://aivorah-attendance-service-y3t6.onrender.com';

// EXPO_PUBLIC_CURRENT_AFFAIRS_URL points only this feature elsewhere (e.g. a preview deploy).
const CURRENT_AFFAIRS_SERVER_URL =
  process.env.EXPO_PUBLIC_CURRENT_AFFAIRS_URL || (USE_LOCAL_SERVICES ? 'http://localhost:3022' : LIVE_SERVICE);

export default CURRENT_AFFAIRS_SERVER_URL;
