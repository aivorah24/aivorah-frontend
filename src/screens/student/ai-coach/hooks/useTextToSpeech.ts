import { useReplyReader } from '../../../../hooks/useReplyReader';

export function useTextToSpeech() {
  const { speakingKey, position, toggle, stop } = useReplyReader<number>();
  return { speakingId: speakingKey, position, speakMessage: toggle, stopSpeaking: stop };
}
