import SERVER_URL from './serverUrl';

// Parent / My Kids backend base URL.
//
// STAGED MIGRATION: the parent domain is being extracted from the monolith
// into aivorah-parent-service. This indirection exists so the frontend
// refactor could be validated by E2E *before* the backend moved — flipping
// this one constant repoints the whole My Kids feature.
//
// Once aivorah-parent-service is live, replace the body with the standard
// per-feature pattern used by the other configs:
//   Platform.OS === 'web' && __DEV__ ? 'http://localhost:4021'
//                                    : 'https://aivorah-parent-service.onrender.com'
const PARENT_SERVER_URL = SERVER_URL;

export default PARENT_SERVER_URL;
