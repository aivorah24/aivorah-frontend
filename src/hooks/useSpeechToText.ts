/**
 * useSpeechToText - the browser's speech recognition (Chrome, Edge, Safari) as
 * a hook: start() listens, the words appear in `transcript` as they are spoken
 * (interim text included), stop() ends it and keeps the text.
 *
 * Long answers: browsers end a recognition session after a pause or about a
 * minute; while the user hasn't pressed stop it is restarted silently, and the
 * text heard so far is kept.
 *
 * Not available on the native app or in Firefox: `supported` is false, so
 * callers hide the mic (chat) or fall back to typing (practice question).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type SpeechError = 'not-allowed' | 'no-microphone' | 'network' | 'unsupported' | 'other';

function recognitionClass(): any {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function speechToTextSupported(): boolean {
  return !!recognitionClass();
}

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(' ');

export function useSpeechToText({ lang = 'en-IN' }: { lang?: string } = {}) {
  const [supported] = useState(speechToTextSupported);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<SpeechError | null>(null);

  const recRef = useRef<any>(null);
  const wantRef = useRef(false);   // user has not pressed stop yet
  const finalRef = useRef('');     // text confirmed by the recogniser so far

  const startSession = useCallback(() => {
    const Rec = recognitionClass();
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recRef.current = rec;

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalRef.current = join(finalRef.current, text);
        else interim = join(interim, text);
      }
      setTranscript(join(finalRef.current, interim));
    };
    rec.onerror = (event: any) => {
      const code = event?.error;
      if (code === 'no-speech' || code === 'aborted') return; // a pause; onend restarts
      wantRef.current = false;
      setError(code === 'not-allowed' || code === 'service-not-allowed' ? 'not-allowed'
        : code === 'audio-capture' ? 'no-microphone'
          : code === 'network' ? 'network' : 'other');
    };
    rec.onend = () => {
      if (recRef.current !== rec) return;
      if (wantRef.current) {
        try { rec.start(); return; } catch { /* fall through: stopped */ }
      }
      recRef.current = null;
      setTranscript(finalRef.current);
      setListening(false);
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      wantRef.current = false;
      recRef.current = null;
      setListening(false);
      setError('other');
    }
  }, [lang]);

  // Begins a NEW recording: the previous text is cleared.
  const start = useCallback(() => {
    if (!supported) { setError('unsupported'); return; }
    if (recRef.current) return;
    finalRef.current = '';
    setTranscript('');
    setError(null);
    wantRef.current = true;
    startSession();
  }, [supported, startSession]);

  const stop = useCallback(() => {
    wantRef.current = false;
    const rec = recRef.current;
    if (rec) { try { rec.stop(); } catch { /* already stopped */ } }
    else setListening(false);
  }, []);

  const reset = useCallback(() => {
    wantRef.current = false;
    const rec = recRef.current;
    recRef.current = null;
    if (rec) { try { rec.abort(); } catch { /* ignore */ } }
    finalRef.current = '';
    setTranscript('');
    setListening(false);
    setError(null);
  }, []);

  // Never leave the microphone on after the screen goes away.
  useEffect(() => () => {
    wantRef.current = false;
    const rec = recRef.current;
    recRef.current = null;
    if (rec) { try { rec.abort(); } catch { /* ignore */ } }
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}

export function speechErrorMessage(error: SpeechError | null): string {
  switch (error) {
    case 'not-allowed': return 'Microphone access is blocked. Allow the microphone for this site in your browser, then try again.';
    case 'no-microphone': return 'No microphone was found. Connect one and try again.';
    case 'network': return 'Speech recognition needs an internet connection. Check your connection and try again.';
    case 'unsupported': return 'Voice input is not available in this browser. Try Chrome or Edge, or type instead.';
    case 'other': return 'Something went wrong with the microphone. Please try again.';
    default: return '';
  }
}
