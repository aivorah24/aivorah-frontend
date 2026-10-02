import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { LiveSpeechStatus, RecognitionEngine, WordStatus } from '../types';
import { STATUS_COLORS } from '../utils/levelMeta';
import { formatDuration } from '../utils/scoring';
import type { ReadAloudStyles } from './styles';

interface Props {
  s: ReadAloudStyles;
  colors: AppColors;
  words: string[];
  wordStatuses: WordStatus[];
  sourcePos: number;
  waveformBars: number[];
  recordingTime: number;
  isPaused: boolean;
  liveSpeechStatus: LiveSpeechStatus;
  activeEngine: RecognitionEngine | null;
  onPause: () => void;
  onResume: () => void;
  onDone: () => void;
}

const ENGINE_LABEL: Record<RecognitionEngine, string> = { vosk: 'On-device (Read Along)', webspeech: 'Browser speech', whisper: 'Cloud (fallback)' };

function statusHint(isPaused: boolean, live: LiveSpeechStatus) {
  if (isPaused) return 'Paused';
  if (live === 'listening') return 'Listening... read the highlighted word aloud';
  if (live === 'unavailable') return 'Live highlight is not supported in this browser';
  if (live === 'error') return 'Live highlight needs microphone/speech permission';
  return 'Recording... read the passage aloud';
}

// Recording: the passage with the live highlight, waveform, timer and Pause/Done.
export default function ReadingView(p: Props) {
  const { s, colors, words, wordStatuses, sourcePos, isPaused } = p;
  const scrollRef = useRef<ScrollView>(null);
  const wordYRef = useRef<number[]>([]);

  // Keep the current word about a third of the way down the view.
  useEffect(() => {
    const y = wordYRef.current[sourcePos];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 130), animated: true });
  }, [sourcePos]);

  return (
    <View style={s.readingContainer}>
      <ScrollView ref={scrollRef} style={s.readingScroll} contentContainerStyle={{ padding: 24, paddingBottom: 160 }}>
        <View style={s.liveWordsWrap}>
          {words.map((w, i) => {
            const status = wordStatuses[i];
            const isCurrent = status === 'current';
            const color = status === 'correct' || status === 'misread' || status === 'skipped' ? STATUS_COLORS[status] : isCurrent ? colors.textMain : colors.textMain + 'CC';
            const bg = isCurrent ? colors.accentYellow + '18'
              : status === 'correct' ? '#9FB2A410' : status === 'misread' ? '#C98A8A14' : status === 'skipped' ? '#C5BD9614' : 'transparent';
            return (
              <View key={`${w}-${i}`} style={s.liveWordSlot} onLayout={(e) => { wordYRef.current[i] = e.nativeEvent.layout.y; }}>
                {isCurrent ? <View style={[s.liveCaret, { backgroundColor: colors.accentYellow }]} /> : null}
                <Text
                  style={[s.liveWord, {
                    color,
                    backgroundColor: bg,
                    borderColor: isCurrent ? colors.accentYellow + '70' : 'transparent',
                    fontWeight: isCurrent || status === 'correct' ? '800' : '500',
                    textDecorationLine: status === 'misread' ? 'underline' : 'none',
                  }]}
                >
                  {w}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={[s.recordingBar, { backgroundColor: colors.cardDark, borderTopColor: colors.borderColor + '30' }]}>
        <View style={s.waveformRow}>
          {p.waveformBars.map((h, i) => (
            <View
              key={i}
              style={{
                width: 3,
                height: isPaused ? 3 : h,
                borderRadius: 2,
                backgroundColor: isPaused ? colors.textDim : colors.accentYellow,
                opacity: isPaused ? 0.4 : 0.7 + (h / 40) * 0.3,
              }}
            />
          ))}
        </View>
        <Text style={{ color: isPaused ? colors.textDim : colors.accentYellow, fontWeight: '700', fontSize: 22, fontVariant: ['tabular-nums'], marginVertical: 8 }}>
          {formatDuration(p.recordingTime)}
        </Text>
        <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 4 }}>{statusHint(isPaused, p.liveSpeechStatus)}</Text>
        {p.activeEngine && (
          <Text style={{ color: colors.textDim + '99', fontSize: 10, marginBottom: 14 }}>Engine: {ENGINE_LABEL[p.activeEngine]}</Text>
        )}
        <View style={s.recordingActionRow}>
          <TouchableOpacity
            onPress={isPaused ? p.onResume : p.onPause}
            style={[s.recordingSecondaryBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgDark + '80' }]}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Feather name={isPaused ? 'play' : 'pause'} size={18} color={colors.textMain} />
            <Text style={[s.recordingBtnText, { color: colors.textMain }]}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={p.onDone}
            style={[s.recordingDoneBtn, { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow }]}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={[s.recordingBtnText, { color: '#fff', fontWeight: '800' }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
