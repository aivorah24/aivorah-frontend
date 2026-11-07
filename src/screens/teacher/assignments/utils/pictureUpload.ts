import { Platform } from 'react-native';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';

// A picture the teacher adds in the Edit tab: picked from the computer (web)
// or the photo library (phone), uploaded like worksheet files, and returned as
// its URL. If the upload fails, a small picture is kept inline instead so the
// teacher's edit is not lost; a large one is refused.
const MAX_INLINE_BYTES = 1_500_000;
const MAX_BYTES = 10_000_000;

type Picked = { base64: string; mime: string; name: string };

function pickOnWeb(): Promise<Picked | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        resolve({ base64: dataUrl.slice(dataUrl.indexOf(',') + 1), mime: file.type || 'image/png', name: file.name || 'picture' });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

async function pickOnPhone(): Promise<Picked | null> {
  const ImagePicker = require('expo-image-picker');
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.85 });
  const a = !res.canceled && res.assets && res.assets[0];
  if (!a || !a.base64) return null;
  return { base64: a.base64, mime: a.mimeType || 'image/jpeg', name: a.fileName || 'picture.jpg' };
}

/** Lets the teacher pick a picture and uploads it. Returns its URL, or null if they cancelled. */
export async function pickAndUploadPicture(): Promise<string | null> {
  const picked = Platform.OS === 'web' ? await pickOnWeb() : await pickOnPhone();
  if (!picked) return null;
  const bytes = Math.floor(picked.base64.length * 0.75);
  if (bytes > MAX_BYTES) throw new Error('That picture is too large (over 10 MB). Please choose a smaller one.');
  try {
    const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/upload-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: picked.base64, fileName: picked.name, mimeType: picked.mime }),
    });
    const data = await res.json();
    if (res.ok && data.url) return data.url;
  } catch { /* fall through to inline */ }
  if (bytes <= MAX_INLINE_BYTES) return `data:${picked.mime};base64,${picked.base64}`;
  throw new Error('The picture could not be uploaded. Please check your connection and try again.');
}
