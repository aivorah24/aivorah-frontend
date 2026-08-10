import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEAL, GOLD, SAGE } from '../constants';

interface Props {
  streak: number;
  totalCoins: number;
  completedCount: number;
  totalHabits: number;
  textMuted: string;
  styles: any;
}

export default function HabitStatsRow({ streak, totalCoins, completedCount, totalHabits, textMuted, styles }: Props) {
  return (
    <View style={styles.statsRow}>
      <LinearGradient colors={[GOLD + '30', GOLD + '10']} style={[styles.statCard, { borderColor: GOLD + '40' }]}>
        <Feather name="zap" size={20} color={GOLD} />
        <Text style={[styles.statNum, { color: GOLD }]}>{streak}</Text>
        <Text style={[styles.statLabel, { color: textMuted }]}>Day Streak</Text>
      </LinearGradient>

      <LinearGradient colors={[TEAL + '30', TEAL + '10']} style={[styles.statCard, { borderColor: TEAL + '40' }]}>
        <Feather name="star" size={20} color={TEAL} />
        <Text style={[styles.statNum, { color: TEAL }]}>{totalCoins}</Text>
        <Text style={[styles.statLabel, { color: textMuted }]}>Total Coins</Text>
      </LinearGradient>

      <LinearGradient colors={[SAGE + '30', SAGE + '10']} style={[styles.statCard, { borderColor: SAGE + '40' }]}>
        <Feather name="check-circle" size={20} color={SAGE} />
        <Text style={[styles.statNum, { color: SAGE }]}>{completedCount}/{totalHabits}</Text>
        <Text style={[styles.statLabel, { color: textMuted }]}>Today</Text>
      </LinearGradient>
    </View>
  );
}
