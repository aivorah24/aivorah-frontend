import { Platform } from 'react-native';
import SERVER_URL from './serverUrl';

// "The World & You" backend base URL — routed to the standalone
// aivorah-world-and-you-service microservice instead of the monolith.
// - Web (local dev): the microservice's local port.
// - Everything else (web prod, native): falls back to SERVER_URL until the
//   microservice has a live/gateway URL of its own.
declare const __DEV__: boolean;

const WORLD_AND_YOU_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3010' : SERVER_URL;

export default WORLD_AND_YOU_SERVER_URL;
