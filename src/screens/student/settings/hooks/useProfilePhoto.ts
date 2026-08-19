import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';

export function useProfilePhoto(userEmail: string | undefined, initialPhotoUrl: string | null, updateUser: (patch: any) => void) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [uploading, setUploading] = useState(false);

  async function handlePickPhoto() {
    if (!userEmail) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const res = await fetch(`${PROFILE_SERVER_URL}/user/upload-photo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, base64: result.assets[0].base64, mimeType: result.assets[0].mimeType ?? 'image/jpeg' }),
      });
      const data = await res.json();
      const url = data.photoUrl || data.url;
      if (url) { setPhotoUrl(url); updateUser({ photoUrl: url }); }
      else Alert.alert('Upload failed', data.error || 'Could not upload photo.');
    } catch { Alert.alert('Upload failed', 'Could not upload photo. Please try again.'); }
    finally { setUploading(false); }
  }

  return { photoUrl, uploading, handlePickPhoto };
}
