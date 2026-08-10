import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  onPress: () => void;
  styles: any;
  colors: AppColors;
}

export default function LeaderboardCTA({ onPress, styles, colors }: Props) {
  return (
    <TouchableOpacity
      style={[styles.leaderCTA, { borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '0C' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Feather name="award" size={16} color={colors.accentYellow} />
      <Text style={[styles.leaderCTAText, { color: colors.accentYellow }]}>Live Class Leaderboard</Text>
      <Feather name="chevron-right" size={16} color={colors.accentYellow} />
    </TouchableOpacity>
  );
}
