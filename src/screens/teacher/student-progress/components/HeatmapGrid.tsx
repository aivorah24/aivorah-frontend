import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import type { HeatmapStudent, HeatmapTopic } from '../types';
import { masteryMeta, summarizeStudentMastery } from '../utils/masteryDisplay';

const NAME_COL_WIDTH = 140;
const TOPIC_COL_WIDTH = 96;
const ROW_HEIGHT = 44;

interface Props {
  colors: AppColors;
  students: HeatmapStudent[];
  topics: HeatmapTopic[];
  // Section E: tapping a cell that has real attempt data opens the
  // drill-down drawer. Cells with no signal (never attempted) aren't
  // pressable — there's nothing real to drill into.
  onCellPress?: (student: HeatmapStudent, topic: string) => void;
}

export default function HeatmapGrid({ colors, students, topics, onCellPress }: Props) {
  if (students.length === 0) {
    return (
      <View style={{ padding: 32, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>No students to show for this filter.</Text>
      </View>
    );
  }
  if (topics.length === 0) {
    return (
      <View style={{ padding: 32, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>No topic activity recorded yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Header row: topic names */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
          <View style={{ width: NAME_COL_WIDTH, justifyContent: 'flex-end', paddingBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>STUDENT</Text>
          </View>
          {topics.map((t) => (
            <View key={t.topic} style={{ width: TOPIC_COL_WIDTH, paddingHorizontal: 4, justifyContent: 'flex-end', paddingBottom: 6 }}>
              <Text numberOfLines={2} style={{ fontSize: 10.5, fontWeight: '600', color: colors.textMuted, textAlign: 'center' }}>{t.topic}</Text>
            </View>
          ))}
        </View>

        {/* Student rows */}
        {students.map((s) => {
          const { masteredPct } = summarizeStudentMastery(s.topicStatus);
          return (
            <View key={s.id} testID={`heatmap-row-${s.id}`} style={{ flexDirection: 'row', height: ROW_HEIGHT, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor + '80' }}>
              <View style={{ width: NAME_COL_WIDTH, paddingRight: 8 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.textMain }}>{s.name}</Text>
                <Text style={{ fontSize: 10.5, color: colors.textDim }}>{masteredPct}% mastered</Text>
              </View>
              {topics.map((t) => {
                const cell = s.topicStatus[t.topic];
                const meta = masteryMeta(cell?.status);
                const hasSignal = !!cell && cell.attempts > 0;
                return (
                  <View key={t.topic} style={{ width: TOPIC_COL_WIDTH, alignItems: 'center' }}>
                    <TouchableOpacity
                      testID={`heatmap-cell-${s.id}-${t.topic}`}
                      accessibilityLabel={`${s.name}: ${t.topic} — ${meta.label}`}
                      disabled={!hasSignal || !onCellPress}
                      onPress={() => onCellPress?.(s, t.topic)}
                      style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: meta.color }}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
