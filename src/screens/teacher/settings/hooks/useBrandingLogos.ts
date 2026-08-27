import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fetchBrandingLogos, uploadBrandingLogo } from '../services/settingsService';

// School + curriculum logo — uploaded once here, reused on every worksheet
// for this school/curriculum (not auto-detected per-PDF).
export function useBrandingLogos(school: string | undefined, curriculum: string | undefined) {
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [curriculumLogoUrl, setCurriculumLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<'school' | 'curriculum' | null>(null);

  useEffect(() => {
    if (!school && !curriculum) return;
    fetchBrandingLogos(school, curriculum)
      .then(data => {
        setSchoolLogoUrl(data.schoolLogoUrl || null);
        setCurriculumLogoUrl(data.curriculumLogoUrl || null);
      })
      .catch(() => {});
  }, [school, curriculum]);

  async function handlePickLogo(kind: 'school' | 'curriculum') {
    const name = kind === 'school' ? school : curriculum;
    if (!name) { Alert.alert(`Set your ${kind} first`, `Add your ${kind} in Profile & Account before uploading its logo.`); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.9, base64: true });
    if (result.canceled || !result.assets?.[0]) return;
    setUploadingLogo(kind);
    try {
      const data = await uploadBrandingLogo(kind, name, result.assets[0].base64!, result.assets[0].mimeType ?? 'image/png');
      if (data.logoUrl) { kind === 'school' ? setSchoolLogoUrl(data.logoUrl) : setCurriculumLogoUrl(data.logoUrl); }
      else Alert.alert('Upload failed', data.error || 'Could not upload logo.');
    } catch { Alert.alert('Upload failed', 'Could not upload logo. Please try again.'); }
    finally { setUploadingLogo(null); }
  }

  return { schoolLogoUrl, curriculumLogoUrl, uploadingLogo, handlePickLogo };
}
