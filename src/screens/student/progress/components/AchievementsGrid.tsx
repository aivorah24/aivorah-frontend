import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Achievement } from '../types';

export function AchievementsGrid({ styles, colors, achievements }: {
  styles: any;
  colors: any;
  achievements: Achievement[];
}) {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  return (
    <>
      <View style={styles.cardHeader}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={[styles.seeAll, { color: '#8A8358' }]}>{unlockedCount}/{achievements.length} unlocked</Text>
      </View>
      <View style={styles.achieveGrid}>
        {achievements.map((a) => (
          <View key={a.label} style={[styles.achieveCard, !a.unlocked && styles.achieveCardLocked]}>
            <View style={[styles.achieveIcon, {
              backgroundColor: a.unlocked ? a.color + '18' : 'rgba(255,255,255,0.03)',
              borderColor:     a.unlocked ? a.color + '40' : 'rgba(255,255,255,0.06)',
            }]}>
              <Feather name={a.icon} size={22} color={a.unlocked ? a.color : colors.textDim} />
            </View>
            <Text style={[styles.achieveLabel, !a.unlocked && { color: colors.textDim }]}>{a.label}</Text>
            {!a.unlocked && <Text style={styles.lockedText}>Locked</Text>}
          </View>
        ))}
      </View>
    </>
  );
}
