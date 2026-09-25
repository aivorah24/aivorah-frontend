import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AppColors } from '../../../../theme';
import type { Challenge } from '../services/teacherChallengesService';
import type { makeStyles } from '../styles';

const GOLD = '#D9A93E';

const DIFF_COLOR = (d: string, c: AppColors) =>
  d === 'Easy' ? c.accentGreen : d === 'Hard' ? c.accentRed : c.accentYellow;

// Data-driven category color, not a fixed lookup - Parent Challenges hit
// this exact bug 2026-09-02 (hardcoded 3-type filter silently dropped every
// challenge once the taxonomy grew beyond school_challenge/olympiad/
// advanced_practice). category is always human-readable text from the API,
// so a stable fallback color works for any value, present or future.
function categoryColor(category: string): string {
  const known: Record<string, string> = {
    'Chapter Quiz':     '#BAA467',
    'School Challenge': '#BAA467',
  };
  return known[category] ?? GOLD;
}

export default function ChallengeCard({ ch, colors, isDark, styles, onAssign, assignedCount = 0, eligibleCount = 0 }: {
  ch: Challenge; colors: AppColors; isDark: boolean;
  styles: ReturnType<typeof makeStyles>;
  onAssign: () => void;
  assignedCount?: number;
  eligibleCount?: number;
}) {
  const diffColor = DIFF_COLOR(ch.difficulty, colors);
  const catColor  = categoryColor(ch.category);

  const cardGradient: [string, string] = isDark
    ? [colors.cardHover, colors.cardDark]
    : [catColor + '22', '#FFFFFF'];
  const titleColor = isDark ? colors.textMain  : '#16241B';
  const descColor  = isDark ? colors.textMuted : '#5C6F62';
  const dimColor   = isDark ? colors.textDim   : '#7C8A82';
  const xpColor    = isDark ? colors.accentYellow : '#9A7B2E';
  const assignBg   = isDark ? 'transparent' : '#FFFFFF';
  const allAssigned = eligibleCount > 0 && assignedCount >= eligibleCount;

  return (
    <LinearGradient colors={cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: catColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.badgesRow}>
          <View style={[styles.categoryBadge, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
            <Text style={[styles.categoryBadgeText, { color: catColor }]}>{ch.category}</Text>
          </View>
          <View style={[styles.diffBadge, { backgroundColor: diffColor + '22', borderColor: diffColor + '55' }]}>
            <Text style={[styles.diffBadgeText, { color: diffColor }]}>{ch.difficulty}</Text>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: titleColor }]}>{ch.title}</Text>
        <Text style={[styles.cardDesc, { color: descColor }]}>{ch.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Feather name="star" size={11} color={xpColor} />
            <Text style={[styles.statText, { color: xpColor }]}>{ch.xpReward} XP</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="help-circle" size={11} color={dimColor} />
            <Text style={[styles.statText, { color: dimColor }]}>{ch.questionCount} Qs</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="clock" size={11} color={dimColor} />
            <Text style={[styles.statText, { color: dimColor }]}>{ch.timeLimitMinutes} min</Text>
          </View>
        </View>

        {assignedCount > 0 && (
          <View style={styles.statItem}>
            <Feather name="check-circle" size={11} color={colors.accentGreen} />
            <Text style={[styles.statText, { color: colors.accentGreen }]}>
              Assigned to {assignedCount} student{assignedCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {allAssigned ? (
          <View style={[styles.assignRowBtn, { backgroundColor: assignBg, borderColor: colors.accentGreen + '66' }]}>
            <Feather name="check" size={13} color={colors.accentGreen} />
            <Text style={[styles.assignRowBtnText, { color: colors.accentGreen }]}>Assigned to all students</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.assignRowBtn, { backgroundColor: assignBg, borderColor: catColor + '66' }]}
            onPress={onAssign} activeOpacity={0.8}
          >
            <Feather name="user-plus" size={13} color={catColor} />
            <Text style={[styles.assignRowBtnText, { color: catColor }]}>
              {assignedCount > 0 ? 'Assign to more students' : 'Assign to Student'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}
