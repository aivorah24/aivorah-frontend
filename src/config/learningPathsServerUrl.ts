import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Learning Path backend base URL — routed to the standalone
// aivorah-learning-paths-service microservice instead of the monolith.
// Serves /teacher/syllabus/* and /ibpyp/* for this flow.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
declare const __DEV__: boolean;

const LIVE_LEARNING_PATHS_BACKEND = 'https://aivorah-learning-paths-service.onrender.com';

const LEARNING_PATHS_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:3015' : LIVE_LEARNING_PATHS_BACKEND;

export default LEARNING_PATHS_SERVER_URL;
