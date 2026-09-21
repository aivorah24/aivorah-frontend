import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface DashboardStatsBarProps {
  students: number;
  teachers: number;
  parents: number;
  activeAnnouncements: number;
  colors: AppColors;
  isMobile?: boolean;
}

export default function DashboardStatsBar({
  students,
  teachers,
  parents,
  activeAnnouncements,
  colors,
  isMobile,
}: DashboardStatsBarProps) {
  return (
    <View style={[styles.statBar, isMobile && styles.statBarMobile]}>
      <StatItem value={students} label="Students" colors={colors} />
      <View style={[styles.statDivider, { backgroundColor: colors.borderColor }]} />
      <StatItem value={teachers} label="Teachers" colors={colors} />
      <View style={[styles.statDivider, { backgroundColor: colors.borderColor }]} />
      <StatItem value={parents} label="Parents" colors={colors} />
      <View style={[styles.statDivider, { backgroundColor: colors.borderColor }]} />
      <StatItem value={activeAnnouncements} label="Active announcements" colors={colors} />
    </View>
  );
}

function StatItem({ value, label, colors }: { value: number; label: string; colors: AppColors }) {
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 20, fontWeight: '800', color: colors.textHeading }}>
        {value}
      </Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 11.5, color: colors.textMuted, marginTop: 1 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: '#000',
    borderRadius: 16,
    marginBottom: 24,
  },
  statBarMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
});
