import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import type { Passage, VoskStatus } from '../types';
import { DEFAULT_GRADIENT, levelMeta } from '../utils/levelMeta';
import type { ReadAloudStyles } from './styles';

interface Props {
  s: ReadAloudStyles;
  colors: AppColors;
  isDark: boolean;
  passage: Passage;
  words: string[];
  listen: { isPlaying: boolean; isPaused: boolean; isLoading: boolean; highlightIdx: number; toggle: () => void };
  voskStatus: VoskStatus;
  onStartReading: () => void;
}

// The passage before reading, with "Listen First" narration highlighting each word.
export default function PassagePreview({ s, colors, isDark, passage, words, listen, voskStatus, onStartReading }: Props) {
  const grad = passage.gradient || DEFAULT_GRADIENT;
  const lm = levelMeta(passage.level);
  const listening = listen.isPlaying || listen.isPaused;
  const listenLabel = listen.isLoading ? 'Loading...' : listen.isPlaying ? 'Pause' : listen.isPaused ? 'Resume' : 'Listen First';
  const preparing = voskStatus === 'loading';

  return (
    <View style={s.idleContainer}>
      <View style={s.passageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.passageTitleLarge, { color: colors.textMain }]}>{passage.title}</Text>
          <View style={s.passageMeta}>
            <View style={[s.levelPill, { backgroundColor: lm.bg, borderColor: lm.border }]}>
              <Text style={[s.levelPillText, { color: lm.text }]}>{lm.label}</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textDim }}>{passage.topic}</Text>
            <Text style={{ fontSize: 12, color: colors.textDim }}>{passage.wordCount} words</Text>
          </View>
        </View>
      </View>

      <View style={[s.textCard, { borderColor: colors.borderColor + '30' }]} testID="read-aloud-passage-text">
        <LinearGradient colors={[grad[0] + '15', grad[1] + '08']} style={s.textCardGradientBar} />
        <Text style={s.passageTextWrap}>
          {words.map((w, i) => {
            const isCurrent = listening && i === listen.highlightIdx;
            const isPast = listening && listen.highlightIdx >= 0 && i < listen.highlightIdx;
            return (
              <Text
                key={i}
                style={{
                  color: isCurrent ? (isDark ? '#FFF' : '#1A1A1A') : isPast ? colors.textMuted : colors.textMain,
                  fontWeight: isCurrent ? '700' : '400',
                  backgroundColor: isCurrent ? colors.accentYellow + (listen.isPaused ? '55' : '30') : 'transparent',
                  textDecorationLine: isCurrent ? 'underline' : 'none',
                  textDecorationColor: colors.accentYellow,
                  fontSize: 19,
                  lineHeight: 36,
                  borderRadius: 6,
                  borderWidth: isCurrent && listen.isPaused ? 2 : 0,
                  borderColor: colors.accentYellow,
                }}
              >
                {w}{' '}
              </Text>
            );
          })}
        </Text>
      </View>

      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.actionBtn, listening
            ? { backgroundColor: colors.accentYellow + '22', borderColor: colors.accentYellow }
            : { backgroundColor: colors.cardDark, borderColor: colors.accentYellow + '60' }]}
          onPress={listen.toggle}
          activeOpacity={0.7}
          disabled={listen.isLoading}
          accessibilityRole="button"
        >
          {listen.isLoading
            ? <ActivityIndicator size="small" color={colors.accentYellow} />
            : <Feather name={listen.isPlaying ? 'pause' : listen.isPaused ? 'play' : 'headphones'} size={18} color={colors.accentYellow} />}
          <Text style={{ color: colors.accentYellow, fontWeight: '700', fontSize: 14 }}>{listenLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionBtn, s.primaryBtn, { backgroundColor: colors.accentYellow }]} onPress={onStartReading} activeOpacity={0.7} accessibilityRole="button">
          {preparing ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="mic" size={18} color="#fff" />}
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{preparing ? 'Start Reading (Preparing engine...)' : 'Start Reading'}</Text>
        </TouchableOpacity>
      </View>
      {preparing && (
        <Text style={{ color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Setting up the voice engine. You can tap Start Reading immediately or wait a second for maximum accuracy!
        </Text>
      )}
    </View>
  );
}
