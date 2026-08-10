import { Platform } from 'react-native';
import SERVER_URL from './serverUrl';

// Daily Habits backend base URL — routed to the standalone
// aivorah-daily-habits-service microservice instead of the monolith.
// - Web (local dev): the microservice's local port.
// - Everything else (web prod, native): falls back to SERVER_URL until the
//   microservice has a live/gateway URL of its own.
declare const __DEV__: boolean;

const DAILY_HABITS_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3012' : SERVER_URL;

export default DAILY_HABITS_SERVER_URL;
