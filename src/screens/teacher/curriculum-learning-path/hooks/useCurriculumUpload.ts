import { useState, useRef, useCallback } from 'react';
import { uploadCurriculum, getCurriculum, startGeneration, CurriculumUploadConfig } from '../services/curriculumLearningPathService';
import { TeacherCurriculum, CurriculumStatus } from '../types';

export const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const TERMINAL_EXTRACT_STATUSES: CurriculumStatus[] = ['processed', 'failed'];
const TERMINAL_GENERATE_STATUSES: CurriculumStatus[] = ['generated', 'failed'];

async function pollUntil(curriculumId: string, isTerminal: (status: CurriculumStatus) => boolean, { intervalMs = 2000, timeoutMs = 180000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { curriculum } = await getCurriculum(curriculumId);
    if (isTerminal(curriculum.status)) return curriculum;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for processing to finish.');
}

interface RunUploadFlowCallbacks {
  setCurriculum: (c: TeacherCurriculum) => void;
  isCancelled: () => boolean;
}

// The upload -> extract-poll -> generate -> generate-poll orchestration,
// separated from the DOM file-picker so it's testable without a real File
// input (see useUploadWorksheet's pickDoc precedent — the picker itself is
// accepted as untestable glue).
export async function runUploadFlow(
  file: { name: string; type: string; blob: Blob },
  { setCurriculum, isCancelled }: RunUploadFlowCallbacks,
  config?: CurriculumUploadConfig
) {
  if (!ACCEPTED_MIME.includes(file.type)) {
    throw new Error('Only PDF, DOCX and XLSX files are supported.');
  }

  const uploadResult = await uploadCurriculum({ name: file.name, mime: file.type, blob: file.blob }, config);
  setCurriculum(uploadResult.curriculum);

  const extracted = await pollUntil(uploadResult.curriculum.id, (s) => TERMINAL_EXTRACT_STATUSES.includes(s));
  if (isCancelled()) return extracted;
  setCurriculum(extracted);
  if (extracted.status === 'failed') {
    throw new Error(extracted.error || 'Could not process the uploaded file.');
  }

  const generateResult = await startGeneration(extracted.id);
  setCurriculum(generateResult.curriculum);

  const generated = await pollUntil(extracted.id, (s) => TERMINAL_GENERATE_STATUSES.includes(s));
  if (isCancelled()) return generated;
  setCurriculum(generated);
  if (generated.status === 'failed') {
    throw new Error(generated.error || 'Could not generate the learning path.');
  }
  return generated;
}

export function useCurriculumUpload() {
  const [curriculum, setCurriculum] = useState<TeacherCurriculum | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cancelledRef = useRef(false);

  const uploadFile = useCallback(async (file: { name: string; type: string; blob: Blob }, config?: CurriculumUploadConfig) => {
    cancelledRef.current = false;
    setError('');
    setBusy(true);
    setCurriculum(null);

    try {
      await runUploadFlow(file, { setCurriculum, isCancelled: () => cancelledRef.current }, config);
    } catch (err: any) {
      if (!cancelledRef.current) setError(err.message || 'Upload failed.');
    } finally {
      if (!cancelledRef.current) setBusy(false);
    }
  }, []);

  const pickAndUpload = useCallback((config?: CurriculumUploadConfig) => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.xlsx';
    input.onchange = (e: any) => {
      const file: File | undefined = e.target.files?.[0];
      if (!file) return;
      uploadFile({ name: file.name, type: file.type, blob: file }, config);
    };
    input.click();
  }, [uploadFile]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    setCurriculum(null);
    setError('');
    setBusy(false);
  }, []);

  return { curriculum, error, busy, pickAndUpload, uploadFile, reset };
}
