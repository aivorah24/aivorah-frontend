import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { ChildData } from '../types';
import CircleProgress from './common/CircleProgress';

export default function AIWeeklyInsightCard({
  child, weeklyProgressPct, insightTopic, isWide, onViewReport, colors, s,
}: {
  child: ChildData; weeklyProgressPct: number; insightTopic: string;
  isWide: boolean; onViewReport: () => void; colors: AppColors; s: any;
}) {
  if (!child.id) return null;

  return (
    <View style={[s.insightCard, isWide && { flex: 1 }]}>
      <View style={s.insightHeader}>
        <View style={s.insightPill}>
          <Feather name="zap" size={11} color={colors.accentYellow} />
          <Text style={s.insightPillText}>AI Weekly Insight</Text>
        </View>
      </View>

      <View style={s.insightBody}>
        <View style={{ flex: 1 }}>
          <Text style={s.insightHeadline}>
            <Text style={{ color: colors.textMain }}>{child.name} is progressing well in </Text>
            <Text style={{ color: colors.accentYellow, fontWeight: '700' }}>{insightTopic}</Text>
            <Text style={{ color: colors.textMain }}>.</Text>
          </Text>

          <View style={s.insightBullets}>
            <View style={s.insightBulletRow}>
              <Feather name="check-circle" size={13} color={colors.accentYellow} />
              <Text style={s.insightBulletText}>Learning consistency
                <Text style={{ color: colors.accentYellow }}>{child.currentStreak > 0 ? `  +${Math.min(child.currentStreak * 6, 32)}% this week` : ''}</Text>
              </Text>
            </View>
            <View style={s.insightBulletRow}>
              <Feather name="check-circle" size={13} color={colors.accentYellow} />
              <Text style={s.insightBulletText}>
                {child.assignmentsDone > 0 ? 'Assignments completed on time' : 'Exploring learning paths'}
              </Text>
            </View>
            <View style={s.insightBulletRow}>
              <Feather name="alert-triangle" size={13} color={colors.accentYellow} />
              <Text style={s.insightBulletText}>Needs more practice sessions</Text>
            </View>
          </View>

          <View style={s.insightRec}>
            <Text style={s.insightRecLabel}>Today&apos;s Recommendation</Text>
            <View style={s.insightRecRow}>
              <Feather name="book-open" size={14} color={colors.textMuted} />
              <Text style={s.insightRecText}>
                Spend 15 minutes on{'\n'}
                <Text style={{ color: colors.textMain, fontWeight: '600' }}>&quot;{insightTopic}&quot;</Text>
              </Text>
            </View>
          </View>
        </View>

        <CircleProgress pct={weeklyProgressPct} colors={colors} />
      </View>

      <TouchableOpacity testID="ai-insight-view-report" style={s.insightCta} onPress={onViewReport} activeOpacity={0.85}>
        <Text style={s.insightCtaText}>View Detailed Report</Text>
        <Feather name="arrow-right" size={13} color={colors.accentYellow} />
      </TouchableOpacity>
    </View>
  );
}
