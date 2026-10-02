import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a no-op, so on web use the browser dialog.
export function notify(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
