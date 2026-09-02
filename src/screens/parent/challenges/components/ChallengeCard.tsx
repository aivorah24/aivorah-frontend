import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Challenge } from '../services/parentChallengesService';
import type { ParentChallengesStyles } from '../styles';

export default function ChallengeCard({ ch, colors, styles, onAssign }: {
  ch: Challenge; colors: AppColors;
  styles: ParentChallengesStyles;
  onAssign: () => void;
}) {
  const diffColor = ch.difficulty === 'Easy' ? colors.accentGreen
    : ch.difficulty === 'Hard' ? colors.accentRed : colors.accentYellow;
  const isAssigned = ch.status === 'assigned' || ch.status === 'completed';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>{ch.title}</Text>
        {isAssigned && (
          <View style={[styles.assignedBadge, {
            backgroundColor: ch.status === 'completed' ? colors.accentGreen + '20' : colors.accentYellow + '20',
            borderColor: ch.status === 'completed' ? colors.accentGreen + '40' : colors.accentYellow + '40',
          }]}>
            <Text style={[styles.assignedBadgeText, {
              color: ch.status === 'completed' ? colors.accentGreen : colors.accentYellow,
            }]}>
              {ch.status === 'completed' ? 'Done' : 'Assigned'}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.cardDesc}>{ch.description}</Text>
      <View style={styles.metaRow}>
        <View style={[styles.metaChip, { backgroundColor: diffColor + '20', borderColor: diffColor + '40' }]}>
          <Text style={[styles.metaChipText, { color: diffColor }]}>{ch.difficulty}</Text>
        </View>
        <View style={styles.xpChip}>
          <Feather name="star" size={10} color={colors.accentYellow} />
          <Text style={[styles.xpChipText, { color: colors.accentYellow }]}>{ch.xpReward} XP</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="clock" size={10} color={colors.textDim} />
          <Text style={styles.metaItemText}>{ch.timeLimitMinutes} min</Text>
        </View>
      </View>
      {!isAssigned && (
        <TouchableOpacity style={styles.assignBtn} onPress={onAssign} activeOpacity={0.8}>
          <Feather name="plus-circle" size={13} color={colors.accentYellow} />
          <Text style={styles.assignBtnText}>Assign to Child</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
