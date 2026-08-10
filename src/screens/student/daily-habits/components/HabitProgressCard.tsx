import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TEAL, GOLD, SAGE } from '../constants';

interface Props {
  allDone: boolean;
  completedCount: number;
  totalHabits: number;
  coinsEarned: number;
  progressPct: number;
  streak: number;
  streakBonus: number;
  cardDark: string;
  borderColor: string;
  textMain: string;
  styles: any;
}

export default function HabitProgressCard({
  allDone, completedCount, totalHabits, coinsEarned, progressPct, streak, streakBonus,
  cardDark, borderColor, textMain, styles,
}: Props) {
  return (
    <View style={[styles.progressCard, { backgroundColor: cardDark, borderColor }]}>
      <View style={styles.progressTop}>
        <Text style={[styles.progressTitle, { color: textMain }]}>
          {allDone ? 'All habits done! Amazing!' : `${completedCount} of ${totalHabits} habits completed`}
        </Text>
        <Text style={[styles.progressCoins, { color: GOLD }]}>+{coinsEarned} coins</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
        <View style={[styles.progressFill, {
          width: `${progressPct * 100}%` as any,
          backgroundColor: allDone ? SAGE : TEAL,
        }]} />
      </View>
      {streak > 0 && streak % 10 === 0 && (
        <View style={styles.streakMilestone}>
          <Feather name="award" size={13} color={GOLD} />
          <Text style={[styles.streakMilestoneText, { color: GOLD }]}>
            {streak}-day streak! {streak === 100 ? `+${streakBonus} bonus coins earned!` : `Keep going to 100 days!`}
          </Text>
        </View>
      )}
    </View>
  );
}
