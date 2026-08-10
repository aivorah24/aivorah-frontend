import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { preprocessForTTS } from '../utils/ttsText';

export function useTextToSpeech() {
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const ttsAudioRef = useRef<any>(null);

  const stopSpeaking = useCallback(() => {
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); ttsAudioRef.current.src = ''; } catch {}
      ttsAudioRef.current = null;
    }
    if (Platform.OS === 'web' && (window as any).speechSynthesis) {
      try { (window as any).speechSynthesis.cancel(); } catch {}
    }
    setSpeakingId(null);
  }, []);

  const speakMessage = useCallback((msgId: number, text: string) => {
    if (Platform.OS !== 'web') return;
    if (speakingId === msgId) { stopSpeaking(); return; }
    stopSpeaking();
    setSpeakingId(msgId);
    if (!(window as any).speechSynthesis) { setSpeakingId(null); return; }
    const synth = (window as any).speechSynthesis;
    const utterance = new (window as any).SpeechSynthesisUtterance(preprocessForTTS(text));
    utterance.lang = 'en-IN';
    utterance.rate = 0.88;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    const voices: SpeechSynthesisVoice[] = synth.getVoices();
    const female = voices.find((v: SpeechSynthesisVoice) =>
      v.lang.startsWith('en') && /female|woman|zira|samantha|victoria|karen|moira/i.test(v.name)
    ) || voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith('en'));
    if (female) utterance.voice = female;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    synth.speak(utterance);
  }, [speakingId, stopSpeaking]);

  return { speakingId, speakMessage, stopSpeaking };
}
