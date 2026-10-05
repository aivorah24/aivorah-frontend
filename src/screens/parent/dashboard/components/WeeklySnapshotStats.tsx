import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { ChildData } from '../types';

export default function WeeklySnapshotStats({
  child, weeklyStudyH, tasksDone, tasksTotal, isB2B, attendanceSummary,
  onViewAttendanceHistory, colors, s,
}: {
  child: ChildData; weeklyStudyH: string; tasksDone: number; tasksTotal: number | null;
  isB2B: boolean; attendanceSummary: any; onViewAttendanceHistory: () => void;
  colors: AppColors; s: any;
}) {
  return (
    <>
      <View style={s.statsRow}>
        {/* Learning Journey */}
        <View style={s.statCard}>
          <View style={[s.statIconWrap, { backgroundColor: colors.accentYellow + '18' }]}>
            <Feather name="clock" size={16} color={colors.accentYellow} />
          </View>
          <View style={s.statInfo}>
            <Text style={s.statLabel}>Learning Journey</Text>
            <Text style={s.statValue}>{weeklyStudyH}</Text>
            {child.currentStreak > 0 && (
              <Text style={s.statSub}>↑ {child.currentStreak * 2}% this week</Text>
            )}
          </View>
        </View>

        {/* Mission Progress */}
        <View style={s.statCard}>
          <View style={[s.statIconWrap, { backgroundColor: colors.accentYellow + '18' }]}>
            <Feather name="layers" size={16} color={colors.accentYellow} />
          </View>
          <View style={s.statInfo}>
            <Text style={s.statLabel}>Mission Progress</Text>
            <Text style={s.statValue}>{tasksDone}{tasksTotal ? ` / ${tasksTotal}` : ' topics'}</Text>
            {tasksTotal ? (
              <>
                <View style={s.progressBarTrack}>
                  <View style={[s.progressBarFill, { width: `${Math.min(100, Math.round((tasksDone / tasksTotal) * 100))}%` as any }]} />
                </View>
                <Text style={s.statSub}>{Math.min(100, Math.round((tasksDone / tasksTotal) * 100))}% Completed</Text>
              </>
            ) : (
              <Text style={s.statSub}>Topics explored</Text>
            )}
          </View>
        </View>

        {/* Growth Points */}
        <View style={s.statCard}>
          <View style={[s.statIconWrap, { backgroundColor: colors.accentYellow + '18' }]}>
            <Feather name="star" size={16} color={colors.accentYellow} />
          </View>
          <View style={s.statInfo}>
            <Text style={s.statLabel}>Growth Points</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={s.statValue}>{child.xpPoints.toLocaleString()}</Text>
              <Text style={s.statXP}>XP</Text>
            </View>
            {child.xpPoints > 0 && (
              <Text style={s.statSub}>↑ {Math.min(child.xpPoints, 150)} this week</Text>
            )}
          </View>
        </View>

        {/* Challenges Done */}
        {child.challengesCompleted > 0 && (
          <View style={s.statCard}>
            <View style={[s.statIconWrap, { backgroundColor: colors.accentYellow + '18' }]}>
              <Feather name="award" size={16} color={colors.accentYellow} />
            </View>
            <View style={s.statInfo}>
              <Text style={s.statLabel}>Challenges Done</Text>
              <Text style={s.statValue}>{child.challengesCompleted}</Text>
              <Text style={s.statSub}>Completed</Text>
            </View>
          </View>
        )}
      </View>

      {/* Attendance Card — B2B only (school-linked parents) */}
      {isB2B && attendanceSummary && attendanceSummary.summary && (
        <View style={[s.statCardFull, { marginTop: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.statIconWrap, { backgroundColor: colors.accentYellow + '18' }]}>
                <Feather name="clipboard" size={16} color={colors.accentYellow} />
              </View>
              <View>
                <Text style={[s.sectionTitle, { fontSize: 15 }]}>Attendance Record</Text>
                {attendanceSummary.summary.ratePct === null || attendanceSummary.summary.ratePct === undefined ? (
                  <Text testID="dashboard-attendance-empty" style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textDim }}>
                    No attendance recorded yet
                  </Text>
                ) : (
                  <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textDim }}>
                    Overall attendance: <Text style={{ color: colors.accentYellow, fontWeight: '700' }}>{attendanceSummary.summary.ratePct}%</Text>
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={s.viewHistoryBtn}
              onPress={onViewAttendanceHistory}
              activeOpacity={0.8}
            >
              <Text style={s.viewHistoryBtnText}>View Monthly Logs</Text>
              <Feather name="chevron-right" size={14} color={colors.accentYellow} />
            </TouchableOpacity>
          </View>

          <View style={s.attendanceMiniBreakdown}>
            <View style={s.miniStatItem}>
              <Text style={[s.miniStatVal, { color: '#10b981' }]}>{attendanceSummary.summary.present}</Text>
              <Text style={s.miniStatLbl}>Present</Text>
            </View>
            <View style={s.miniStatItem}>
              <Text style={[s.miniStatVal, { color: colors.accentRed }]}>{attendanceSummary.summary.absent}</Text>
              <Text style={s.miniStatLbl}>Absent</Text>
            </View>
            <View style={s.miniStatItem}>
              <Text style={[s.miniStatVal, { color: '#f59e0b' }]}>{attendanceSummary.summary.late}</Text>
              <Text style={s.miniStatLbl}>Late</Text>
            </View>
            <View style={s.miniStatItem}>
              <Text style={s.miniStatVal}>{attendanceSummary.summary.total}</Text>
              <Text style={s.miniStatLbl}>Total Days</Text>
            </View>
          </View>
        </View>
      )}
    </>
  );
}
