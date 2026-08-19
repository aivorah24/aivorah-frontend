import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { RecentActivityItem } from '../types';

export default function StudentOverviewCard({
  colors, gold, totalStudents, activeToday, needsAttentionCount, recentStudents, styles, navigation,
}: {
  colors: AppColors;
  gold: string;
  totalStudents: number;
  activeToday: number;
  needsAttentionCount: number;
  recentStudents: RecentActivityItem[];
  styles: any;
  navigation: any;
}) {
  return (
    <TouchableOpacity style={[styles.card, styles.flex1]} activeOpacity={0.85} onPress={() => navigation.navigate('TeacherStudents' as any)}>
      <View style={styles.cardHeader}>
        <Feather name="users" size={15} color={gold} />
        <Text style={styles.cardTitle}>Student Overview</Text>
      </View>
      <Text style={styles.bigNumber}>{totalStudents}</Text>
      <Text style={[styles.changeText, { color: colors.accentGreen }]}>Total Students</Text>
      <Text style={styles.overviewLabel}>Enrolled in your class</Text>
      <View style={styles.overviewDivider} />
      <View style={styles.overviewRow}>
        <TouchableOpacity style={styles.overviewStat} activeOpacity={0.7}
          onPress={(e) => { e.stopPropagation(); navigation.navigate('TeacherStudents' as any, { initialTab: 'Active Today' }); }}>
          <Text style={[styles.overviewVal, { color: colors.accentGreen }]}>{activeToday}</Text>
          <Text style={styles.overviewKey}>Active Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.overviewStat, { borderLeftWidth: 1, borderLeftColor: colors.borderColor }]} activeOpacity={0.7}
          onPress={(e) => { e.stopPropagation(); navigation.navigate('TeacherStudents' as any, { initialTab: 'Needs Attention' }); }}>
          <Text style={[styles.overviewVal, { color: colors.accentRed }]}>{needsAttentionCount}</Text>
          <Text style={styles.overviewKey}>Need Attention</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.overviewDivider, { marginTop: spacing.md, marginBottom: spacing.md }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        <Feather name="clock" size={12} color={colors.textDim} />
      </View>
      {recentStudents.length === 0 ? (
        <Text style={[styles.overviewLabel, { textAlign: 'center', marginVertical: spacing.sm }]}>
          No recent activity
        </Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {recentStudents.map((item, i) => (
            <TouchableOpacity key={item.id} activeOpacity={0.7}
              style={[styles.actRowCompact, i < recentStudents.length - 1 && styles.actBorderCompact]}
              onPress={(e) => { e.stopPropagation(); navigation.navigate('TeacherProgress' as any, { studentId: item.studentId }); }}>
              <View style={[styles.actAvatarCompact, { backgroundColor: gold + '15' }]}>
                <Feather name={item.icon} size={13} color={gold} />
              </View>
              <View style={styles.actInfoCompact}>
                <Text style={styles.actNameCompact} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.actActionCompact} numberOfLines={1}>
                  {item.title ? (
                    <>
                      {item.prefix}
                      <Text style={{ fontWeight: '700', color: colors.textMain }}>{item.title}</Text>
                      {item.suffix}
                    </>
                  ) : item.action}
                </Text>
              </View>
              <View style={styles.actRightCompact}>
                <Text style={styles.actTimeCompact}>{item.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}
