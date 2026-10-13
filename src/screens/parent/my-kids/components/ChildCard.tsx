import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { childStudentStatus, STATUS_META } from '../../../../utils/studentStatus';
import { normalizeCurriculum } from '../../../../utils/curriculum';

export function formatStudyTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function ChildCard({ child, colors, styles, navigation, onRemove, onEdit, onManageTasks, onViewCreds }: any) {
  const totalTopics = child.totalTopics || 0;
  const progressPct = totalTopics > 0
    ? Math.round(((child.completedTopics?.length ?? 0) / totalTopics) * 100)
    : 0;
  const { color: badgeColor, label: badgeLabel } = STATUS_META[childStudentStatus(child)];

  return (
    <View style={styles.childCard}>
      <View style={styles.childCardHeader}>
        <View style={[styles.avatar, { backgroundColor: badgeColor + '20' }]}>
          <Text style={[styles.avatarText, { color: badgeColor }]}>
            {child.name[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.childName} numberOfLines={1}>{child.name}</Text>
          <Text style={styles.childSub} numberOfLines={1}>{child.grade}{child.curriculum ? ` · ${normalizeCurriculum(child.curriculum)}` : ''}{child.school ? ` · ${child.school}` : ''}</Text>
        </View>
        <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => onEdit(child)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="edit-2" size={15} color={colors.textDim} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onRemove(child)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '33' }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Study Time Today</Text>
          <Text style={styles.statValue}>{formatStudyTime(child.todayStudyMinutes ?? 0)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Chapters Done</Text>
          <Text style={[styles.statValue, { color: totalTopics > 0 && progressPct >= 50 ? colors.accentGreen : colors.textMain }]}>
            {totalTopics > 0 ? `${child.completedTopics?.length ?? 0}/${totalTopics}` : 'Coming Soon'}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={[styles.statValue, { color: (child.currentStreak ?? 0) >= 3 ? colors.accentGreen : colors.accentYellow }]}>
            {child.currentStreak ?? 0}d
          </Text>
        </View>
      </View>

      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={styles.statLabel}>Chapter Progress</Text>
          <Text style={[styles.statLabel, { color: colors.accentYellow }]}>{progressPct}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderColor }]}>
          <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: colors.accentYellow }]} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={[styles.quickBtn, { flex: 1 }]}
          onPress={() => onManageTasks(child)}
          activeOpacity={0.7}
        >
          <Feather name="check-square" size={14} color={colors.accentYellow} />
          <Text style={[styles.quickBtnText, { color: colors.accentYellow }]}>Daily Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { flex: 1 }]}
          onPress={() => onViewCreds(child)}
          activeOpacity={0.7}
        >
          <Feather name="key" size={14} color={colors.accentYellow} />
          <Text style={[styles.quickBtnText, { color: colors.accentYellow }]}>Login Info</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickNav}>
        {[
          { icon: 'grid', label: 'Dashboard', screen: 'ParentStudentView' },
          { icon: 'book-open', label: 'Learning', screen: 'ParentLearning' },
          { icon: 'bar-chart-2', label: 'Progress', screen: 'ParentProgress' },
          { icon: 'calendar', label: 'Schedule', screen: 'ParentSchedule' },
        ].map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={styles.quickBtn}
            onPress={() => btn.screen === 'ParentStudentView'
              ? navigation.navigate(btn.screen, { childData: child })
              : navigation.navigate(btn.screen, { childId: child.id })}
            activeOpacity={0.7}
          >
            <Feather name={btn.icon as any} size={14} color={colors.accentYellow} />
            <Text style={[styles.quickBtnText, { color: colors.accentYellow }]}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.recentSection}>
        <View style={styles.activityRow}>
          <Feather name="zap" size={13} color={colors.accentYellow} />
          <Text style={styles.activityText}>{child.xpPoints ?? 0} XP earned · Level {child.level ?? 1}</Text>
        </View>
        {child.lastLesson ? (
          <View style={styles.activityRow}>
            <Feather name="check-circle" size={13} color={colors.accentGreen} />
            <Text style={styles.activityText}>Last lesson: {child.lastLesson}</Text>
          </View>
        ) : null}
        {(child.assignmentsDone ?? 0) > 0 && (
          <View style={styles.activityRow}>
            <Feather name="clipboard" size={13} color={colors.accentBlue} />
            <Text style={styles.activityText}>{child.assignmentsDone} assignment{child.assignmentsDone > 1 ? 's' : ''} completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}
