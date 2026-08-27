import { Platform } from 'react-native';

// Teacher Students microservice (aivorah-students-service) — roster-management
// endpoints (create/link/remove/promote/bulk-import students), extracted from
// the ai-mentor monolith's routes/teacher.js and routes/student.js (2026-08-26).
// Web dev uses the local service port; everything else uses the live deployment.
declare const __DEV__: boolean;

// Deployed on Render (confirmed 2026-08-26) — verified live via a real
// available-to-link request that hit Supabase and returned real roster data.
const LIVE_SERVICE = 'https://aivorah-students-service.onrender.com';

const STUDENTS_SERVER_URL =
   LIVE_SERVICE;

export default STUDENTS_SERVER_URL;
