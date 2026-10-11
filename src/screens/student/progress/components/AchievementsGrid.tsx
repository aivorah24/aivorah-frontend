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
        <Text style={[styles.seeAll, { color: '#C9A24E' }]}>{unlockedCount}/{achievements.length} unlocked</Text>
      </View>
      <View style={styles.achieveGrid}>
        {achievements.map((a) => (
          <View
            key={a.label}
            testID={a.unlocked ? 'achievement-unlocked' : 'achievement-locked'}
            style={[
              styles.achieveCard,
              a.unlocked
                ? { backgroundColor: a.color + '14', borderColor: a.color + '66', shadowColor: a.color, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } }
                : styles.achieveCardLocked,
            ]}
          >
            <View style={[styles.achieveIcon, a.unlocked
              ? { backgroundColor: a.color, borderColor: a.color }
              : { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.borderColor }]}>
              <Feather name={a.unlocked ? a.icon : 'lock'} size={22} color={a.unlocked ? '#FFFFFF' : colors.textDim} />
            </View>
            <Text style={[styles.achieveLabel, !a.unlocked && { color: colors.textDim }]}>{a.label}</Text>
            {a.unlocked ? (
              <View style={[styles.unlockedBadge, { backgroundColor: a.color + '22' }]}>
                <Feather name="check" size={10} color={a.color} />
                <Text style={[styles.unlockedBadgeText, { color: a.color }]}>Unlocked</Text>
              </View>
            ) : (
              <Text style={styles.lockedText}>{a.hint ?? 'Locked'}</Text>
            )}
          </View>
        ))}
      </View>
    </>
  );
}
