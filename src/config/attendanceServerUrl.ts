import { Platform } from 'react-native';

// Attendance microservice (aivorah-attendance-service).
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-attendance-service-y3t6.onrender.com';

const ATTENDANCE_SERVER_URL =
  Platform.OS === 'web' && __DEV__ ? 'http://localhost:3022' : LIVE_SERVICE;

export default ATTENDANCE_SERVER_URL;
