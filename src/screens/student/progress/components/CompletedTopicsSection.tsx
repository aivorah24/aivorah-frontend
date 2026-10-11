import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export function CompletedTopicsSection({ styles, colors, completedSet, navigation }: {
  styles: any;
  colors: any;
  completedSet: Set<string>;
  navigation: any;
}) {
  if (completedSet.size === 0) return null;
  return (
    <>
      <View style={styles.cardHeader}>
        <Text style={styles.sectionTitle}>Completed Topics</Text>
        <TouchableOpacity onPress={() => navigation.navigate('LearningPaths')} activeOpacity={0.7}>
          <Text style={[styles.seeAll, { color: colors.accentYellow }]}>See all →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.topicsList}>
        {[...completedSet].slice(0, 6).map(topic => (
          <View key={topic} style={styles.topicChip}>
            <Feather name="check-circle" size={13} color="#C9A24E" />
            <Text style={styles.topicChipText} numberOfLines={1}>{topic}</Text>
          </View>
        ))}
        {completedSet.size > 6 && (
          <View style={[styles.topicChip, { backgroundColor: 'rgba(255,255,255,0.04)' }]}>
            <Text style={[styles.topicChipText, { color: colors.textMuted }]}>+{completedSet.size - 6} more</Text>
          </View>
        )}
      </View>
    </>
  );
}
