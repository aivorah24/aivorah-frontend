import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { DEFAULT_GRADIENT } from '../utils/levelMeta';
import { formatDuration } from '../utils/scoring';
import type { ReadAloudStyles } from './styles';

export function CountdownView({ s, colors, count }: { s: ReadAloudStyles; colors: AppColors; count: number }) {
  return (
    <View style={[s.countdownOverlay, { backgroundColor: colors.bgDark }]}>
      <View style={s.countdownCircle}>
        <Text style={[s.countdownNum, { color: colors.accentYellow }]}>{count > 0 ? count : 'Go!'}</Text>
      </View>
      <Text style={[s.countdownHint, { color: colors.textMuted }]}>Get ready to read...</Text>
    </View>
  );
}

interface PreviewProps {
  s: ReadAloudStyles;
  colors: AppColors;
  text: string;
  gradient?: [string, string];
  recordingTime: number;
  isPlayingBack: boolean;
  onTogglePlayback: () => void;
  onRetry: () => void;
  onSubmit: () => void;
}

// After "Done": listen back, record again, or submit for scoring.
export function RecordingPreview({ s, colors, text, gradient, recordingTime, isPlayingBack, onTogglePlayback, onRetry, onSubmit }: PreviewProps) {
  const accent = (gradient || DEFAULT_GRADIENT)[0];
  return (
    <View style={s.readingContainer}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 180 }}>
        <Text style={{ fontSize: 22, lineHeight: 40, color: colors.textMain, marginBottom: 24 }}>{text}</Text>
      </ScrollView>
      <View style={[s.recordingBar, { backgroundColor: colors.cardDark, borderTopColor: colors.borderColor + '30' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Feather name="check-circle" size={16} color={colors.accentYellow} />
          <Text style={{ color: colors.accentYellow, fontWeight: '700', fontSize: 15 }}>Recording Complete</Text>
        </View>
        <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 14 }}>
          Duration: {formatDuration(recordingTime)} — Listen back or submit for analysis
        </Text>
        <View style={s.previewActionRow}>
          <TouchableOpacity onPress={onTogglePlayback} style={[s.previewSecondaryBtn, { borderColor: accent, backgroundColor: accent + '12' }]} activeOpacity={0.7} accessibilityRole="button">
            <Feather name={isPlayingBack ? 'pause' : 'play'} size={16} color={accent} />
            <Text style={[s.previewBtnText, { color: accent }]}>{isPlayingBack ? 'Pause' : 'Listen'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRetry} style={[s.previewSecondaryBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgDark + '80' }]} activeOpacity={0.7} accessibilityRole="button">
            <Feather name="rotate-ccw" size={16} color={colors.textMuted} />
            <Text style={[s.previewBtnText, { color: colors.textMuted }]}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSubmit} style={[s.previewSubmitBtn, { backgroundColor: colors.accentYellow, borderColor: colors.accentYellow }]} activeOpacity={0.7} accessibilityRole="button">
            <Feather name="send" size={16} color="#fff" />
            <Text style={[s.previewBtnText, { color: '#fff', fontWeight: '800' }]}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function AnalysingView({ s, colors }: { s: ReadAloudStyles; colors: AppColors }) {
  return (
    <View style={[s.readingContainer, { justifyContent: 'center', alignItems: 'center', gap: 20 }]}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accentYellow + '15', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accentYellow} />
      </View>
      <Text style={{ color: colors.accentYellow, fontWeight: '700', fontSize: 18 }}>Analysing your reading...</Text>
      <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
        Our AI is listening to your recording and checking each word
      </Text>
    </View>
  );
}
