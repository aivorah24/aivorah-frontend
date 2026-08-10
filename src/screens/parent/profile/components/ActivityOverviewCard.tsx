import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ActivityOverviewCard({
  activeDays, totalStudyDisplay, childrenCount, colors, s,
}: {
  activeDays: number; totalStudyDisplay: string; childrenCount: number; colors: any; s: any;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Feather name="activity" size={16} color={colors.accentYellow} />
        <Text style={s.cardTitle}>Activity Overview</Text>
        <View style={s.weekBadge}>
          <Text style={s.weekBadgeText}>This Week</Text>
        </View>
      </View>

      <View style={s.statsGrid}>
        <View style={s.statCell}>
          <Text style={[s.statBig, { color: colors.accentYellow }]}>{activeDays}<Text style={{ fontSize: 14, fontWeight: '600' }}>/7</Text></Text>
          <Text style={s.statSmallLabel}>ACTIVE DAYS</Text>
        </View>
        <View style={s.statDividerV} />
        <View style={s.statCell}>
          <Text style={s.statBig}>{totalStudyDisplay}</Text>
          <Text style={s.statSmallLabel}>TOTAL LEARNING TIME</Text>
        </View>
        <View style={s.statDividerV} />
        <View style={s.statCell}>
          <Text style={[s.statBig, { color: colors.accentYellow }]}>{childrenCount} kids</Text>
          <Text style={s.statSmallLabel}>LINKED</Text>
        </View>
      </View>
    </View>
  );
}
