import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { notify } from '../utils/notify';
import {
  isVoskModelReady,
  isVoskSupported,
  loadVoskModel,
  startVoskRecognition,
  stopVoskRecognition,
} from '../../../../services/voskRecognition';
import { assessReading, saveLexile, transcribeLive, transcribeRecording } from '../services/readAloudApi';
import type {
  AssessResult, LiveSpeechStatus, Passage, RecognitionEngine, SessionPhase, VoskStatus, WordStatus,
} from '../types';
import { advanceStatuses, followAlong, initialStatuses, newFollowState, revealFrame, type Marks } from '../utils/followAlong';
import { alignServerStatuses, calibrationFeedback, calibrationLexile, finalizeStatuses, localAssessment } from '../utils/scoring';
import { splitWords, spokenWordsOf } from '../utils/wordMatching';

const COUNTDOWN_FROM = 3;
const COUNTDOWN_TICK_MS = 800;
const VOSK_LOAD_TIMEOUT_MS = 3500;
const WAVEFORM_BARS = 24;
const REVEAL_TICK_MS = 40;
const WHISPER_POLL_MS = 3000;
const LIVE_CLIP_MIN_BYTES = 25000;
const LIVE_CLIP_MAX_BYTES = 1500000;
const MIN_RECORDING_BYTES = 500;
// Whisper live polling may over-match; never let the highlight outrun ~2 words a second.
const WHISPER_MAX_WORDS_PER_SEC = 2;
const MIME_OPTIONS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

const flatBars = () => new Array(WAVEFORM_BARS).fill(3);

interface Options {
  passage: Passage | null;
  grade: string;
  isCalibration: boolean;
  onCalibrated: (lexile: number) => void;
  onLexileChanged: (lexile: number | null | undefined) => void;
  addXP: (xp: number) => void;
}

// Records the child reading, follows along word by word, then scores the reading.
export function useReadingSession({ passage, grade, isCalibration, onCalibrated, onLexileChanged, addXP }: Options) {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>([]);
  const [sourcePos, setSourcePos] = useState(0);
  const [countdownNum, setCountdownNum] = useState(COUNTDOWN_FROM);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [liveSpeechStatus, setLiveSpeechStatus] = useState<LiveSpeechStatus>('idle');
  const [voskStatus, setVoskStatus] = useState<VoskStatus>(Platform.OS === 'web' && isVoskSupported() ? 'loading' : 'unavailable');
  const [activeEngine, setActiveEngine] = useState<RecognitionEngine | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>(flatBars);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [starsEarned, setStarsEarned] = useState(0);

  const passageRef = useRef<Passage | null>(passage);
  const optionsRef = useRef({ grade, isCalibration, onCalibrated, onLexileChanged, addXP });
  const mountedRef = useRef(true);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const waveformRafRef = useRef(0);
  const liveActiveRef = useRef(false);
  const voskActiveRef = useRef(false);
  const speechRecogRef = useRef<any>(null);
  const whisperTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const whisperBusyRef = useRef(false);
  const whisperAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const whisperStatusesRef = useRef<string[]>([]);
  const followRef = useRef(newFollowState());
  const targetStatusesRef = useRef<WordStatus[]>([]);
  const displayPosRef = useRef(0);
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordStatusesRef = useRef<WordStatus[]>([]);

  useEffect(() => {
    passageRef.current = passage;
    optionsRef.current = { grade, isCalibration, onCalibrated, onLexileChanged, addXP };
  });

  const words = useMemo(() => splitWords(passage?.text || ''), [passage]);
  const passageWords = () => splitWords(passageRef.current?.text || '');

  const showStatuses = useCallback((statuses: WordStatus[], pos?: number) => {
    wordStatusesRef.current = statuses;
    setWordStatuses(statuses);
    if (pos !== undefined) setSourcePos(pos);
  }, []);

  // Preload the on-device engine so "Start Reading" can use it straight away.
  useEffect(() => {
    if (Platform.OS !== 'web' || !isVoskSupported()) return;
    let settled = false;
    const timeout = setTimeout(() => { if (!settled && mountedRef.current) setVoskStatus('unavailable'); }, VOSK_LOAD_TIMEOUT_MS);
    loadVoskModel().then((ok) => {
      settled = true;
      clearTimeout(timeout);
      if (mountedRef.current) setVoskStatus(ok ? 'ready' : 'unavailable');
    });
    return () => clearTimeout(timeout);
  }, []);

  // ── Live highlight ────────────────────────────────────────────────
  const stopReveal = useCallback(() => {
    if (revealTimerRef.current) { clearInterval(revealTimerRef.current); revealTimerRef.current = null; }
  }, []);

  // ASR arrives in bursts; glide the visible cursor toward the true position for a smooth sweep.
  const ensureReveal = useCallback(() => {
    if (revealTimerRef.current) return;
    revealTimerRef.current = setInterval(() => {
      const frame = revealFrame(targetStatusesRef.current, displayPosRef.current, followRef.current.cursor);
      if (!frame) { stopReveal(); return; }
      displayPosRef.current = frame.display;
      showStatuses(frame.visible, frame.display);
    }, REVEAL_TICK_MS);
  }, [showStatuses, stopReveal]);

  const advanceTo = useCallback((to: number, marks?: Partial<Marks>) => {
    const next = advanceStatuses(targetStatusesRef.current, passageWords(), followRef.current.cursor, to, marks);
    if (!next) return;
    targetStatusesRef.current = next.statuses;
    followRef.current.cursor = next.pos;
    ensureReveal();
  }, [ensureReveal]);

  const onSpokenWords = useCallback((spoken: string[]) => {
    if (!liveActiveRef.current) return;
    const step = followAlong(followRef.current, passageWords(), spoken, voskActiveRef.current);
    if (step) advanceTo(step.to, step);
  }, [advanceTo]);

  // Whisper fallback (no Web Speech): step the highlight one word at a time toward the server's position.
  const animateWhisperTo = useCallback((serverPos: number, serverStatuses?: string[]) => {
    if (whisperAnimRef.current) { clearInterval(whisperAnimRef.current); whisperAnimRef.current = null; }
    if (serverStatuses) whisperStatusesRef.current = serverStatuses;
    const total = passageWords().length;
    if (!total) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const target = Math.min(serverPos, Math.ceil(elapsed * WHISPER_MAX_WORDS_PER_SEC));
    const gap = target - followRef.current.cursor;
    if (gap <= 0) return;
    const interval = gap <= 3 ? 200 : gap <= 8 ? 120 : 60;
    whisperAnimRef.current = setInterval(() => {
      const cur = followRef.current.cursor;
      if (cur >= target || cur >= total) {
        if (whisperAnimRef.current) clearInterval(whisperAnimRef.current);
        whisperAnimRef.current = null;
        return;
      }
      const statuses: WordStatus[] = targetStatusesRef.current.length === total ? targetStatusesRef.current.slice() : new Array(total).fill('pending');
      const srv = whisperStatusesRef.current[cur];
      statuses[cur] = srv === 'misread' || srv === 'skipped' ? srv : 'correct';
      if (cur + 1 < total) statuses[cur + 1] = 'current';
      followRef.current.cursor = cur + 1;
      targetStatusesRef.current = statuses;
      displayPosRef.current = cur + 1;
      showStatuses(statuses, cur + 1);
    }, interval);
  }, [showStatuses]);

  const pollWhisper = useCallback(async () => {
    const text = passageRef.current?.text;
    if (whisperBusyRef.current || !audioChunksRef.current.length || !text) return;
    const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
    if (blob.size < LIVE_CLIP_MIN_BYTES || blob.size > LIVE_CLIP_MAX_BYTES) return;
    whisperBusyRef.current = true;
    try {
      const data = await transcribeLive(blob, text);
      if ((data.matchedUpTo || 0) > followRef.current.cursor) animateWhisperTo(data.matchedUpTo || 0, data.wordStatuses);
    } catch { /* next poll retries */ }
    whisperBusyRef.current = false;
  }, [animateWhisperTo]);

  const startWhisperPolling = useCallback(() => {
    setActiveEngine('whisper');
    if (whisperTimerRef.current) clearInterval(whisperTimerRef.current);
    whisperTimerRef.current = setInterval(() => { if (liveActiveRef.current) pollWhisper(); }, WHISPER_POLL_MS);
  }, [pollWhisper]);

  const stopLiveRecognition = useCallback(() => {
    liveActiveRef.current = false;
    setLiveSpeechStatus('idle');
    if (whisperTimerRef.current) { clearInterval(whisperTimerRef.current); whisperTimerRef.current = null; }
    if (whisperAnimRef.current) { clearInterval(whisperAnimRef.current); whisperAnimRef.current = null; }
    if (voskActiveRef.current) { stopVoskRecognition(); voskActiveRef.current = false; }
    if (speechRecogRef.current) {
      try { speechRecogRef.current.stop(); } catch { /* already stopped */ }
      speechRecogRef.current = null;
    }
    // Snap to the true position so scoring sees final statuses.
    stopReveal();
    if (targetStatusesRef.current.length) {
      displayPosRef.current = followRef.current.cursor;
      showStatuses(targetStatusesRef.current.slice(), followRef.current.cursor);
    }
  }, [showStatuses, stopReveal]);

  // Engines, best first: Vosk (on-device, limited to passage words), browser Web Speech, Whisper polling.
  const startLiveRecognition = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    liveActiveRef.current = true;
    setLiveSpeechStatus('listening');

    if (isVoskSupported() && isVoskModelReady() && mediaStreamRef.current) {
      const started = await startVoskRecognition({ stream: mediaStreamRef.current, grammarWords: passageWords(), onWords: onSpokenWords });
      if (started && liveActiveRef.current) {
        voskActiveRef.current = true;
        setActiveEngine('vosk');
        return;
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { startWhisperPolling(); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    speechRecogRef.current = recognition;
    recognition.onresult = (event: any) => {
      if (!liveActiveRef.current) return;
      const spoken: string[] = [];
      for (let i = 0; i < event.results.length; i++) spoken.push(...spokenWordsOf(event.results[i][0].transcript));
      onSpokenWords(spoken);
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        speechRecogRef.current = null;
        startWhisperPolling();
      }
    };
    // Web Speech stops after pauses; keep it going while reading.
    recognition.onend = () => {
      if (liveActiveRef.current && speechRecogRef.current === recognition) {
        try { recognition.start(); } catch { /* already started */ }
      }
    };
    try {
      recognition.start();
      setActiveEngine('webspeech');
    } catch {
      setLiveSpeechStatus('unavailable');
    }
  }, [onSpokenWords, startWhisperPolling]);

  // ── Mic, waveform, timers ────────────────────────────────────────
  const stopWaveform = useCallback(() => {
    if (waveformRafRef.current) { cancelAnimationFrame(waveformRafRef.current); waveformRafRef.current = 0; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* closed */ } audioCtxRef.current = null; }
    setWaveformBars(flatBars());
  }, []);

  const startWaveform = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const step = Math.floor(data.length / WAVEFORM_BARS);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setWaveformBars(Array.from({ length: WAVEFORM_BARS }, (_, i) => Math.max(3, ((data[i * step] || 0) / 255) * 40)));
        waveformRafRef.current = requestAnimationFrame(tick);
      };
      waveformRafRef.current = requestAnimationFrame(tick);
    } catch { /* no visualiser on this browser */ }
  }, []);

  const startRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 200);
  }, []);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  }, []);

  const releaseMic = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* stopped */ }
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const clearRecording = useCallback(() => {
    if (playbackAudioRef.current) { try { playbackAudioRef.current.pause(); } catch { /* not playing */ } playbackAudioRef.current = null; }
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = null;
    recordedBlobRef.current = null;
    setRecordedBlobUrl(null);
    setIsPlayingBack(false);
    setRecordingTime(0);
  }, []);

  // ── Reading flow ─────────────────────────────────────────────────
  const beginReading = useCallback(async () => {
    countdownTimerRef.current = null;
    if (Platform.OS !== 'web') {
      notify('Not Supported', 'Read Aloud works in your web browser.');
      setPhase('idle');
      return;
    }
    let stream = mediaStreamRef.current;
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        notify('Microphone Access', 'Please allow microphone access in your browser settings.');
        setPhase('idle');
        return;
      }
      mediaStreamRef.current = stream;
    }
    if (!mountedRef.current) { releaseMic(); return; }

    const statuses = initialStatuses(passageWords().length, true);
    targetStatusesRef.current = statuses.slice();
    followRef.current = newFollowState();
    displayPosRef.current = 0;
    stopReveal();
    showStatuses(statuses, 0);
    startTimeRef.current = Date.now();
    setRecordingTime(0);
    setIsPaused(false);
    clearRecording();
    setPhase('reading');

    const mimeType = MIME_OPTIONS.find((mt) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mt)) || '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    audioChunksRef.current = [];
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e: BlobEvent) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
    recorder.start(250);

    startWaveform(stream);
    // A recognizer warmed up during the countdown keeps running, so the first word isn't clipped.
    if (voskActiveRef.current || speechRecogRef.current) {
      liveActiveRef.current = true;
      setLiveSpeechStatus('listening');
    } else {
      startLiveRecognition();
    }
    startRecordingTimer();
  }, [clearRecording, releaseMic, showStatuses, startLiveRecognition, startRecordingTimer, startWaveform, stopReveal]);

  const startCountdown = useCallback((passageOverride?: Passage) => {
    if (passageOverride) passageRef.current = passageOverride;
    setResult(null);
    setPhase('countdown');
    setCountdownNum(COUNTDOWN_FROM);
    // Warm the mic + recognizer during the 3-2-1 so the opening word isn't lost.
    if (Platform.OS === 'web' && !mediaStreamRef.current && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          if (!mountedRef.current || !countdownTimerRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
          mediaStreamRef.current = stream;
          startLiveRecognition().then(() => { liveActiveRef.current = false; });
        })
        .catch(() => { /* asked again when reading starts */ });
    }
    let count = COUNTDOWN_FROM;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      count--;
      if (count > 0) { setCountdownNum(count); return; }
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setCountdownNum(0);
      beginReading();
    }, COUNTDOWN_TICK_MS);
  }, [beginReading, startLiveRecognition]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'recording') return;
    recorder.pause();
    setIsPaused(true);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    stopWaveform();
    stopLiveRecognition();
  }, [stopLiveRecognition, stopWaveform]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== 'paused') return;
    recorder.resume();
    setIsPaused(false);
    if (mediaStreamRef.current) startWaveform(mediaStreamRef.current);
    startLiveRecognition();
    startRecordingTimer();
  }, [startLiveRecognition, startRecordingTimer, startWaveform]);

  const stopReading = useCallback(async () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    stopWaveform();
    stopLiveRecognition();
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); recorder.stop(); });
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    recordedBlobRef.current = blob;
    blobUrlRef.current = URL.createObjectURL(blob);
    setRecordedBlobUrl(blobUrlRef.current);
    setIsPlayingBack(false);
    setPhase('preview');
  }, [stopLiveRecognition, stopWaveform]);

  const retryRecording = useCallback(() => {
    clearRecording();
    startCountdown();
  }, [clearRecording, startCountdown]);

  const togglePlayback = useCallback(() => {
    const url = blobUrlRef.current;
    if (Platform.OS !== 'web' || !url) return;
    const current = playbackAudioRef.current;
    if (current && !current.paused) { current.pause(); setIsPlayingBack(false); return; }
    let audio = current;
    if (audio) audio.currentTime = 0;
    else {
      audio = new window.Audio(url);
      audio.addEventListener('ended', () => setIsPlayingBack(false));
      playbackAudioRef.current = audio;
    }
    audio.play();
    setIsPlayingBack(true);
  }, []);

  const finishReading = useCallback(async (statuses: WordStatus[]) => {
    const { grade: g, isCalibration: calibrating, onCalibrated: calibrated, onLexileChanged: lexileChanged, addXP: award } = optionsRef.current;
    const duration = (Date.now() - startTimeRef.current) / 1000;
    const p = passageRef.current;
    const final = finalizeStatuses(statuses);
    showStatuses(final);
    setPhase('reviewing');

    let scored: AssessResult;
    let fromServer = true;
    try {
      scored = await assessReading({ passage: p?.text || '', wordStatuses: final, duration, grade: g, topic: p?.topic || '' });
    } catch {
      scored = localAssessment(final, duration);
      fromServer = false;
    }
    if (!mountedRef.current) return;

    if (calibrating) {
      const lexile = calibrationLexile(g, scored.accuracy || 0, scored.wcpm || 0);
      try { await saveLexile(lexile, 'calibration'); } catch { /* kept for this visit */ }
      calibrated(lexile);
      setResult({ ...scored, isCalibration: true, calibrationLexile: lexile, feedback: calibrationFeedback(lexile), ...(fromServer ? {} : { level: 'good' }) });
      return;
    }
    setResult(scored);
    if (scored.starsEarned) {
      setStarsEarned(scored.starsEarned);
      try { award(scored.starsEarned); } catch { /* XP is best effort */ }
    }
    lexileChanged(scored.lexile);
  }, [showStatuses]);

  const submitRecording = useCallback(async () => {
    if (playbackAudioRef.current) { try { playbackAudioRef.current.pause(); } catch { /* not playing */ } playbackAudioRef.current = null; }
    setIsPlayingBack(false);
    const blob = recordedBlobRef.current;
    if (!blob || blob.size < MIN_RECORDING_BYTES) { finishReading(wordStatusesRef.current); return; }
    setPhase('analysing');
    try {
      const data = await transcribeRecording(blob, passageRef.current?.text || '');
      const statuses = alignServerStatuses(data.wordStatuses, passageWords().length);
      showStatuses(statuses);
      finishReading(statuses);
    } catch {
      finishReading(wordStatusesRef.current);
    }
  }, [finishReading, showStatuses]);

  // Stops everything in flight (countdown, mic, recognition, playback) and returns to the passage.
  const reset = useCallback(() => {
    clearTimers();
    stopWaveform();
    stopLiveRecognition();
    releaseMic();
    clearRecording();
    followRef.current = newFollowState();
    targetStatusesRef.current = [];
    displayPosRef.current = 0;
    showStatuses(initialStatuses(passageWords().length, false), 0);
    setResult(null);
    setStarsEarned(0);
    setIsPaused(false);
    setPhase('idle');
  }, [clearRecording, clearTimers, releaseMic, showStatuses, stopLiveRecognition, stopWaveform]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      if (whisperTimerRef.current) clearInterval(whisperTimerRef.current);
      if (whisperAnimRef.current) clearInterval(whisperAnimRef.current);
      if (waveformRafRef.current) cancelAnimationFrame(waveformRafRef.current);
      liveActiveRef.current = false;
      if (voskActiveRef.current) stopVoskRecognition();
      try { speechRecogRef.current?.stop(); } catch { /* stopped */ }
      try { audioCtxRef.current?.close(); } catch { /* closed */ }
      try { playbackAudioRef.current?.pause(); } catch { /* not playing */ }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return {
    phase,
    words,
    wordStatuses,
    sourcePos,
    countdownNum,
    recordingTime,
    isPaused,
    hasRecording: !!recordedBlobUrl,
    isPlayingBack,
    liveSpeechStatus,
    voskStatus,
    activeEngine,
    waveformBars,
    result,
    starsEarned,
    startCountdown,
    pauseRecording,
    resumeRecording,
    stopReading,
    retryRecording,
    togglePlayback,
    submitRecording,
    reset,
  };
}
