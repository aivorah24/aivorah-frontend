import { USE_LOCAL_SERVICES } from './localServices';
import { Platform } from 'react-native';

// Timetable & Resources microservice (aivorah-timetable-resources-service).
declare const __DEV__: boolean;

const LIVE_SERVICE = 'https://aivorah-timetable-resources-service-jsb4.onrender.com';

const TIMETABLE_RESOURCES_SERVER_URL =
  USE_LOCAL_SERVICES ? 'http://localhost:3021' : LIVE_SERVICE;

export default TIMETABLE_RESOURCES_SERVER_URL;
