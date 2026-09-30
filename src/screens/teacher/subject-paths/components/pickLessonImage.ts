import * as ImagePicker from 'expo-image-picker';
import { uploadLessonImage } from '../services/subjectEditsService';

// Lets the teacher choose a picture and stores it; resolves to its web address, or null if they cancelled.
export async function pickLessonImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const blob = await (await fetch(asset.uri)).blob();
  const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const { url } = await uploadLessonImage({ blob, name: asset.fileName || `picture.${ext}` });
  return url;
}
