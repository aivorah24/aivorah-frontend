import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { HelpTopic } from '../types';

interface TopicsListProps {
  topics: HelpTopic[];
  search: string;
  colors: AppColors;
  isDark: boolean;
  onSelectTopic: (topic: HelpTopic) => void;
}

export default function TopicsList({ topics, search, colors, isDark, onSelectTopic }: TopicsListProps) {
  const styles = makeStyles(colors, isDark);

  return (
    <View style={styles.topicsGrid}>
      {topics.map(t => (
        <TouchableOpacity key={t.label} testID={`topic-row-${t.label}`} style={[styles.topicRow, { borderColor: colors.borderColor }]} onPress={() => onSelectTopic(t)} activeOpacity={0.7}>
          <View style={[styles.topicIcon, { backgroundColor: t.color + '18' }]}>
            <Feather name={t.icon} size={18} color={t.color} />
          </View>
          <Text style={styles.topicLabel}>{t.label}</Text>
          <Feather name="chevron-right" size={16} color={colors.textDim} style={{ marginLeft: 'auto' as any }} />
        </TouchableOpacity>
      ))}
      {topics.length === 0 && <Text style={styles.emptyText}>No topics match &quot;{search}&quot;</Text>}
    </View>
  );
}

const makeStyles = (c: AppColors, isDark: boolean) => StyleSheet.create({
  topicsGrid: { gap: 0, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.sm },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 15, backgroundColor: c.cardDark, borderBottomWidth: 1, borderBottomColor: c.borderColor },
  topicIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topicLabel: { fontSize: 14, fontWeight: '600', color: isDark ? '#F5F3EE' : c.textMain, flex: 1 },
  emptyText: { fontSize: 14, color: c.textDim, fontStyle: 'italic', padding: spacing.lg },
});
