import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import type { ReadAloudStyles } from './styles';

interface Props {
  s: ReadAloudStyles;
  colors: AppColors;
  lexile: number | null;
  onStart: () => void;
  onSkip: () => void;
}

export default function CalibrationPrompt({ s, colors, lexile, onStart, onSkip }: Props) {
  return (
    <View style={s.calibrationWrap}>
      <LinearGradient colors={['#9FB2A428', '#C3DCD818']} style={s.calibrationCard}>
        <View style={s.calibrationIcon}>
          <Feather name="bar-chart-2" size={32} color={colors.accentYellow} />
        </View>
        <Text style={s.calibrationTitle}>Reading Level Check</Text>
        <Text style={s.calibrationText}>
          {"Let's find the right reading level for you! Read a short passage aloud and we'll set your Lexile level."}
        </Text>
        {lexile != null && (
          <View style={s.calibrationLexile}>
            <Text style={{ fontSize: 13, color: colors.accentYellow, fontWeight: '700' }}>Current Lexile: {lexile}L</Text>
          </View>
        )}
        <TouchableOpacity onPress={onStart} style={s.calibrationStart} accessibilityRole="button">
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Start Reading Test</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSkip} style={{ paddingVertical: 8 }} accessibilityRole="button">
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Skip for now</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}
