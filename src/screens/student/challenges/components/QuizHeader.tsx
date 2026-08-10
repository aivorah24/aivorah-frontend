import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Challenge } from '../types';

interface Props {
  activeChallenge: Challenge | null;
  questionCount: number;
  timeLeft: number | null;
  hasResult: boolean;
  onClose: () => void;
  colors: AppColors;
}

export default function QuizHeader({ activeChallenge, questionCount, timeLeft, hasResult, onClose, colors }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>{activeChallenge?.title}</Text>
        <Text style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
          {questionCount || activeChallenge?.questionCount} questions · {activeChallenge?.timeLimitMinutes} min
        </Text>
      </View>
      {timeLeft !== null && !hasResult && (() => {
        const m = Math.floor(timeLeft / 60);
        const s = timeLeft % 60;
        const urgent = timeLeft <= 60;
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: urgent ? colors.accentRed + '22' : colors.cardDark, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10 }}>
            <Feather name="clock" size={13} color={urgent ? colors.accentRed : colors.textMuted} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: urgent ? colors.accentRed : colors.textMain, fontVariant: ['tabular-nums'] as any }}>
              {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </Text>
          </View>
        );
      })()}
      {!hasResult && (
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Feather name="x" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}
