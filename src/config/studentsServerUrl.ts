import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Teacher Students microservice (aivorah-students-service) — roster-management
// endpoints (create/link/remove/promote/bulk-import students), extracted from
// the ai-mentor monolith's routes/teacher.js and routes/student.js (2026-08-26).
// Web dev uses the local service port; everything else uses the live deployment.
declare const __DEV__: boolean;

// Deployed on Render (confirmed 2026-08-26) — verified live via a real
// available-to-link request that hit Supabase and returned real roster data.
//
// 2026-09-18: migrated to a new Render account (old account suspended for
// billing). Temporary URL — Render appended a random suffix since the
// original name is still claimed by the suspended account.
const LIVE_SERVICE = 'https://aivorah-students-service.onrender.com';

// EXPO_PUBLIC_STUDENTS_URL points only this service elsewhere (e.g. a local copy).
const STUDENTS_SERVER_URL =
  process.env.EXPO_PUBLIC_STUDENTS_URL || (USE_LOCAL_SERVICES ? 'http://localhost:3017' : LIVE_SERVICE);

export default STUDENTS_SERVER_URL;
