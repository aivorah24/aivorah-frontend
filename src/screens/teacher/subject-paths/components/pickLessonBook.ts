import { Platform } from 'react-native';
import { uploadLessonBook } from '../services/subjectEditsService';

const MAX_BYTES = 10 * 1024 * 1024;

function choosePdf(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

// Lets the teacher choose a book PDF and stores it; resolves to its address and name, or null if they cancelled.
export async function pickLessonBook(): Promise<{ url: string; fileName: string } | null> {
  if (Platform.OS !== 'web') throw new Error('Upload a book from the web app on a computer.');
  const file = await choosePdf();
  if (!file) return null;
  if (file.size > MAX_BYTES) throw new Error('Books must be under 10MB — upload just the chapter you need.');
  return uploadLessonBook({ blob: file, name: file.name });
}
