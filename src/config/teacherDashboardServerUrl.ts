import { Platform } from 'react-native';

// Teacher Dashboard microservice (aivorah-teacher-dashboard-service) —
// student list / insights / recent-activity, extracted from the ai-mentor
// monolith's routes/student.js (2026-08-24). Web dev uses the local service
// port; everything else uses the live deployment.
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-teacher-dashboard-service.onrender.com';

const TEACHER_DASHBOARD_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3016' : LIVE_SERVICE;

export default TEACHER_DASHBOARD_SERVER_URL;
