import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { formatStudyTime } from '../utils/dashboardHelpers';
import DonutChart from './common/DonutChart';

export default function ClassProgressCard({
  colors, gold, ringTrack, totalStudents,
  classProgressPct, medianCombinedMins, minCombinedMins, maxCombinedMins,
  avgProgress, totalAssignmentsSubmitted, totalAssignmentsAssigned, assignSubmitPct,
  totalChallengesCompleted, totalChallengesAssigned, challCompletePct,
  styles,
}: {
  colors: AppColors;
  gold: string;
  ringTrack: string;
  totalStudents: number;
  classProgressPct: number;
  medianCombinedMins: number;
  minCombinedMins: number;
  maxCombinedMins: number;
  avgProgress: number;
  totalAssignmentsSubmitted: number;
  totalAssignmentsAssigned: number;
  assignSubmitPct: number;
  totalChallengesCompleted: number;
  totalChallengesAssigned: number;
  challCompletePct: number;
  styles: any;
}) {
  return (
    <View style={[styles.card, styles.flex1]}>
      <View style={styles.cardHeader}>
        <Feather name="activity" size={15} color={colors.accentCyan} />
        <Text style={styles.cardTitle}>Class Progress</Text>
      </View>

      {/* Donut + study time */}
      <View style={styles.donutRow}>
        <View style={styles.donutWrap}>
          <DonutChart progress={classProgressPct / 100} size={72} color={gold} trackColor={ringTrack} />
          <View style={styles.donutCenter}>
            <Text style={[styles.donutPct, { color: gold }]}>{classProgressPct}%</Text>
          </View>
        </View>
        <View style={styles.donutStats}>
          <Text style={styles.donutStatVal}>{formatStudyTime(medianCombinedMins)}</Text>
          <Text style={styles.donutStatLabel}>Typical Study Time</Text>
        </View>
      </View>

      {totalStudents > 1 && (
        <View style={{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.accentRed }}>{formatStudyTime(minCombinedMins)}</Text>
            <Text style={{ fontSize: 9, color: colors.textDim, fontWeight: '600', marginTop: 1 }}>Lowest</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderColor }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: gold }}>{formatStudyTime(medianCombinedMins)}</Text>
            <Text style={{ fontSize: 9, color: colors.textDim, fontWeight: '600', marginTop: 1 }}>Typical</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.accentGreen }}>{formatStudyTime(maxCombinedMins)}</Text>
            <Text style={{ fontSize: 9, color: colors.textDim, fontWeight: '600', marginTop: 1 }}>Highest</Text>
          </View>
        </View>
      )}

      {/* 3 progress bars */}
      <View style={styles.progressBars}>
        {/* Learning Path */}
        <View style={styles.progressItem}>
          <View style={styles.progressLabelRow}>
            <Feather name="map" size={11} color={gold} />
            <Text style={styles.progressLabel}>Learning Path</Text>
            <Text style={[styles.progressPct, { color: gold }]}>{avgProgress}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderColor }]}>
            <View style={[styles.progressFill, { width: `${avgProgress}%` as any, backgroundColor: gold }]} />
          </View>
        </View>

        {/* Assignments */}
        <View style={styles.progressItem}>
          <View style={styles.progressLabelRow}>
            <Feather name="edit-3" size={11} color="#8A8358" />
            <Text style={styles.progressLabel}>Assignments</Text>
            <Text style={[styles.progressPct, { color: '#8A8358' }]}>
              {totalAssignmentsSubmitted}/{totalAssignmentsAssigned} · {assignSubmitPct}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderColor }]}>
            <View style={[styles.progressFill, { width: `${assignSubmitPct}%` as any, backgroundColor: '#8A8358' }]} />
          </View>
        </View>

        {/* Challenges */}
        <View style={styles.progressItem}>
          <View style={styles.progressLabelRow}>
            <Feather name="target" size={11} color={gold} />
            <Text style={styles.progressLabel}>Challenges</Text>
            <Text style={[styles.progressPct, { color: gold }]}>
              {totalChallengesCompleted}/{totalChallengesAssigned} · {challCompletePct}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderColor }]}>
            <View style={[styles.progressFill, { width: `${challCompletePct}%` as any, backgroundColor: gold }]} />
          </View>
        </View>
      </View>
    </View>
  );
}
