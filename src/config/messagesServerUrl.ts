import { Platform } from 'react-native';

// Messages backend base URL — routed to the standalone
// aivorah-messages-service microservice instead of the monolith.
declare const __DEV__: boolean;

const LIVE_MESSAGES_BACKEND = 'https://aivorah-messages-service.onrender.com';

const MESSAGES_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3020' : LIVE_MESSAGES_BACKEND;

export default MESSAGES_SERVER_URL;
