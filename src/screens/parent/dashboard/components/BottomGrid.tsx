import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ChildData } from '../types';
import { formatStudyTime } from '../utils/dashboardHelpers';

export default function BottomGrid({
  child, subjectPerf, badges, isWide, onViewHighlights, onViewReport, onViewBadges, colors, s,
}: {
  child: ChildData;
  subjectPerf: { subject: string; avgScore: number; attempts: number }[];
  badges: { icon: string; label: string; color: string }[];
  isWide: boolean;
  onViewHighlights: () => void; onViewReport: () => void; onViewBadges: () => void;
  colors: AppColors; s: any;
}) {
  return (
    <View style={[s.bottomGrid, isWide && { flexDirection: 'row' }]}>

      {/* Learning Highlights */}
      <View style={[s.gridCard, isWide && { flex: 1 }]}>
        <Text style={s.cardTitle}>Learning Highlights</Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          {child.xpPoints > 0 && (
            <View style={s.highlightRow}>
              <View style={[s.highlightIcon, { backgroundColor: colors.accentYellow + '20' }]}>
                <Feather name="award" size={14} color={colors.accentYellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.highlightTitle, { color: colors.accentYellow }]}>New Personal Best</Text>
                <Text style={s.highlightDesc}>XP points: {child.xpPoints.toLocaleString()}</Text>
              </View>
            </View>
          )}
          {child.currentStreak >= 1 && (
            <View style={s.highlightRow}>
              <View style={[s.highlightIcon, { backgroundColor: colors.accentYellow + '20' }]}>
                <Feather name="zap" size={14} color={colors.accentYellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.highlightTitle, { color: colors.textMain }]}>{child.currentStreak}-Day Streak</Text>
                <Text style={s.highlightDesc}>Consistent daily learning</Text>
              </View>
            </View>
          )}
          {child.assignmentsDone > 0 && (
            <View style={s.highlightRow}>
              <View style={[s.highlightIcon, { backgroundColor: colors.accentYellow + '20' }]}>
                <Feather name="check-circle" size={14} color={colors.accentYellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.highlightTitle, { color: colors.accentYellow }]}>AI Recommendation</Text>
                <Text style={s.highlightDesc}>Practice and revise topics tomorrow.</Text>
              </View>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.cardFooterBtn} onPress={onViewHighlights} activeOpacity={0.8}>
          <Text style={s.cardFooterText}>View All Highlights</Text>
          <Feather name="arrow-right" size={13} color={colors.accentYellow} />
        </TouchableOpacity>
      </View>

      {/* Subject Performance */}
      <View style={[s.gridCard, isWide && { flex: 1 }]}>
        <Text style={s.cardTitle}>Subject Performance</Text>
        <View style={{ gap: 12, marginTop: 8 }}>
          {subjectPerf.length === 0 ? (
            <Text style={[s.highlightDesc, { textAlign: 'center', paddingVertical: 12 }]}>
              No quiz data yet
            </Text>
          ) : subjectPerf.map(sub => (
            <View key={sub.subject} style={s.subjectRow}>
              <View style={s.subjectInfo}>
                <Text style={s.subjectName}>{sub.subject}</Text>
                <Text style={s.subjectPct}>{Math.round(sub.avgScore)}%</Text>
              </View>
              <View style={s.subjectTrack}>
                <View style={[s.subjectFill, { width: `${Math.round(sub.avgScore)}%` as any, backgroundColor: colors.accentYellow }]} />
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity testID="subject-performance-view-report" style={s.cardFooterBtn} onPress={onViewReport} activeOpacity={0.8}>
          <Text style={s.cardFooterText}>View Detailed Report</Text>
          <Feather name="arrow-right" size={13} color={colors.accentYellow} />
        </TouchableOpacity>
      </View>

      {/* Learning Mood */}
      <View style={[s.gridCard, isWide && { flex: 1 }]}>
        <Text style={s.cardTitle}>Learning Mood</Text>
        <View style={s.moodCenter}>
          <View style={s.moodCircle}>
            <Feather name="smile" size={32} color={colors.accentYellow} />
          </View>
          <Text style={s.moodLabel}>
            {child.currentStreak >= 3 ? 'Focused' : child.studyTimeMinutes > 60 ? 'Active' : 'Warming Up'}
          </Text>
          <Text style={s.moodSub}>
            {child.currentStreak >= 3
              ? `${child.currentStreak}-day streak going strong`
              : child.studyTimeMinutes > 0
              ? `${formatStudyTime(child.studyTimeMinutes)} total study time`
              : 'Just getting started'}
          </Text>
        </View>
        <View style={{ gap: 8, marginTop: 8 }}>
          {child.currentStreak >= 1 && (
            <View style={s.moodRow}>
              <Feather name="zap" size={12} color={colors.accentYellow} />
              <Text style={s.moodText}>{child.currentStreak} day{child.currentStreak > 1 ? 's' : ''} in a row</Text>
            </View>
          )}
          {child.assignmentsDone > 0 && (
            <View style={s.moodRow}>
              <Feather name="check-circle" size={12} color={colors.accentYellow} />
              <Text style={s.moodText}>{child.assignmentsDone} assignment{child.assignmentsDone > 1 ? 's' : ''} completed</Text>
            </View>
          )}
          {child.completedTopics.length > 0 && (
            <View style={s.moodRow}>
              <Feather name="book-open" size={12} color={colors.accentYellow} />
              <Text style={s.moodText}>{child.completedTopics.length} topic{child.completedTopics.length > 1 ? 's' : ''} explored</Text>
            </View>
          )}
          {child.currentStreak === 0 && child.assignmentsDone === 0 && child.completedTopics.length === 0 && (
            <View style={s.moodRow}>
              <Feather name="info" size={12} color={colors.textDim} />
              <Text style={s.moodText}>No activity logged yet</Text>
            </View>
          )}
        </View>
      </View>

      {/* Achievements */}
      <View style={[s.gridCard, isWide && { flex: 1 }]}>
        <Text style={s.cardTitle}>Achievements</Text>
        {badges.length > 0 ? (
          <View style={s.badgeGrid}>
            {badges.slice(0, 3).map((b, i) => (
              <View key={i} style={s.badgeItem}>
                <View style={s.badgeIconWrap}>
                  <Feather name={b.icon as any} size={20} color={colors.accentYellow} />
                </View>
                <Text style={s.badgeLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.badgeGrid}>
            {[
              { icon: 'zap', label: '5 Day\nStreak' },
              { icon: 'award', label: 'Fast\nLearner' },
              { icon: 'book-open', label: 'Reading\nStar' },
            ].map((b, i) => (
              <View key={i} style={[s.badgeItem, { opacity: 0.35 }]}>
                <View style={s.badgeIconWrap}>
                  <Feather name={b.icon as any} size={20} color={colors.accentYellow} />
                </View>
                <Text style={s.badgeLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={s.cardFooterBtn} onPress={onViewBadges} activeOpacity={0.8}>
          <Text style={s.cardFooterText}>View All Badges</Text>
          <Feather name="arrow-right" size={13} color={colors.accentYellow} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
