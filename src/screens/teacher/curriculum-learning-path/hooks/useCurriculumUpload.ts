import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadCurriculum, getCurriculum, listCurricula, retryCurriculum, CurriculumUploadConfig } from '../services/curriculumLearningPathService';
import { TeacherCurriculum, CurriculumProgress, UploadPhase } from '../types';

export const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const POLL_INTERVAL_MS = 2500;
const CONNECTION_ISSUE_AFTER = 3;

type PickedFile = { name: string; type: string; blob: Blob };
const isTerminal = (c: TeacherCurriculum) => c.status === 'generated' || c.status === 'failed';

export function useCurriculumUpload() {
  const [curriculum, setCurriculum] = useState<TeacherCurriculum | null>(null);
  const [progress, setProgress] = useState<CurriculumProgress | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [error, setError] = useState('');
  const [connectionIssue, setConnectionIssue] = useState(false);
  // Bumped on new upload/reset/unmount so stale polls and uploads drop their results.
  const runRef = useRef(0);
  const pendingRef = useRef<{ file: PickedFile; config?: CurriculumUploadConfig } | null>(null);

  const poll = useCallback(async (id: string, run: number) => {
    let failures = 0;
    while (runRef.current === run) {
      try {
        const res = await getCurriculum(id);
        if (runRef.current !== run) return;
        failures = 0;
        setConnectionIssue(false);
        setCurriculum(res.curriculum);
        setProgress(res.progress ?? null);
        if (isTerminal(res.curriculum)) return;
      } catch {
        if (runRef.current !== run) return;
        failures += 1;
        if (failures >= CONNECTION_ISSUE_AFTER) setConnectionIssue(true);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }, []);

  const uploadFile = useCallback(async (file: PickedFile, config?: CurriculumUploadConfig) => {
    const run = ++runRef.current;
    pendingRef.current = { file, config };
    setError('');
    setConnectionIssue(false);
    setCurriculum(null);
    setProgress(null);
    if (!ACCEPTED_MIME.includes(file.type)) {
      setFileName(null);
      setPhase('idle');
      setError('Only PDF, DOCX and XLSX files are supported.');
      return;
    }
    setFileName(file.name);
    setPhase('uploading');
    try {
      const res = await uploadCurriculum({ name: file.name, mime: file.type, blob: file.blob }, config);
      if (runRef.current !== run) return;
      setCurriculum(res.curriculum);
      setPhase('tracking');
      await poll(res.curriculum.id, run);
    } catch (err: any) {
      if (runRef.current !== run) return;
      setError(err.message || 'Upload failed.');
      setPhase('upload_failed');
    }
  }, [poll]);

  const retry = useCallback(async () => {
    if (phase === 'upload_failed' && pendingRef.current) {
      await uploadFile(pendingRef.current.file, pendingRef.current.config);
      return;
    }
    if (!curriculum || curriculum.status !== 'failed') return;
    const run = ++runRef.current;
    setError('');
    try {
      const res = await retryCurriculum(curriculum.id);
      if (runRef.current !== run) return;
      setCurriculum(res.curriculum);
      setProgress(null);
      await poll(curriculum.id, run);
    } catch (err: any) {
      if (runRef.current === run) setError(err.message || 'Retry failed.');
    }
  }, [phase, curriculum, uploadFile, poll]);

  // DB is the source of truth: restore the caller's latest curriculum on mount.
  useEffect(() => {
    const run = ++runRef.current;
    listCurricula(1).then((res) => {
      const latest = res.curricula?.[0];
      if (!latest || runRef.current !== run) return;
      setCurriculum(latest);
      setProgress(latest.progress ?? null);
      setFileName(latest.file_name);
      setPhase('tracking');
      if (!isTerminal(latest)) poll(latest.id, run);
    }).catch(() => {});
    return () => { runRef.current += 1; };
  }, [poll]);

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
    runRef.current += 1;
    pendingRef.current = null;
    setCurriculum(null);
    setProgress(null);
    setFileName(null);
    setPhase('idle');
    setError('');
    setConnectionIssue(false);
  }, []);

  const busy = phase === 'uploading' || (phase === 'tracking' && !!curriculum && !isTerminal(curriculum));

  return { curriculum, progress, fileName, phase, error, busy, connectionIssue, pickAndUpload, uploadFile, retry, reset };
}
