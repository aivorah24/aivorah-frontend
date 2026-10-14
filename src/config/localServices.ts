import { Platform } from 'react-native';

declare const __DEV__: boolean;

// Web dev talks to the LIVE services by default (most features need several
// services running at once). Set EXPO_PUBLIC_USE_LOCAL_SERVICES=1 before
// `expo start` to point every *ServerUrl at its localhost port instead.
export const USE_LOCAL_SERVICES =
  Platform.OS === 'web' && __DEV__ && process.env.EXPO_PUBLIC_USE_LOCAL_SERVICES === '1';
