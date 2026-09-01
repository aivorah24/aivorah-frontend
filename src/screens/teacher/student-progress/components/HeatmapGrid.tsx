import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { HeatmapStudent, HeatmapTopic } from '../types';
import { masteryMeta, summarizeStudentMastery } from '../utils/masteryDisplay';

const NAME_COL_WIDTH = 140;
const TOPIC_COL_WIDTH = 96;
const ROW_HEIGHT = 44;
// A real class can run ~30 students and a full-year syllabus can run 30+
// topics — both need pagination or the grid becomes an unusable wall of
// cells. Same ROWS_PER_PAGE convention as ActivityTable.tsx for consistency.
const STUDENTS_PER_PAGE = 10;
const TOPICS_PER_PAGE = 10;

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
  const [studentPage, setStudentPage] = useState(0);
  const [topicPage, setTopicPage] = useState(0);

  // Reset to page 1 whenever the underlying (possibly filtered) list shrinks
  // below the current page — avoids landing on an empty page after filtering.
  const maxStudentPage = Math.max(0, Math.ceil(students.length / STUDENTS_PER_PAGE) - 1);
  const safeStudentPage = Math.min(studentPage, maxStudentPage);
  const pageStudents = students.slice(safeStudentPage * STUDENTS_PER_PAGE, safeStudentPage * STUDENTS_PER_PAGE + STUDENTS_PER_PAGE);

  const maxTopicPage = Math.max(0, Math.ceil(topics.length / TOPICS_PER_PAGE) - 1);
  const safeTopicPage = Math.min(topicPage, maxTopicPage);
  const pageTopics = topics.slice(safeTopicPage * TOPICS_PER_PAGE, safeTopicPage * TOPICS_PER_PAGE + TOPICS_PER_PAGE);

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
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>No syllabus topics found for this class.</Text>
      </View>
    );
  }

  return (
    <View>
      {topics.length > TOPICS_PER_PAGE && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Text style={{ fontSize: 11, color: colors.textDim }}>
            Topics {safeTopicPage * TOPICS_PER_PAGE + 1}-{Math.min(topics.length, (safeTopicPage + 1) * TOPICS_PER_PAGE)} of {topics.length}
          </Text>
          <TouchableOpacity testID="heatmap-topic-page-prev" disabled={safeTopicPage === 0} onPress={() => setTopicPage((p) => Math.max(0, p - 1))}>
            <Feather name="chevron-left" size={16} color={safeTopicPage === 0 ? colors.borderColor : colors.textMain} />
          </TouchableOpacity>
          <TouchableOpacity testID="heatmap-topic-page-next" disabled={safeTopicPage >= maxTopicPage} onPress={() => setTopicPage((p) => Math.min(maxTopicPage, p + 1))}>
            <Feather name="chevron-right" size={16} color={safeTopicPage >= maxTopicPage ? colors.borderColor : colors.textMain} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row: topic names */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
            <View style={{ width: NAME_COL_WIDTH, justifyContent: 'flex-end', paddingBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>STUDENT</Text>
            </View>
            {pageTopics.map((t) => (
              <View key={t.topic} style={{ width: TOPIC_COL_WIDTH, paddingHorizontal: 4, justifyContent: 'flex-end', paddingBottom: 6 }}>
                <Text numberOfLines={2} style={{ fontSize: 10.5, fontWeight: '600', color: colors.textMuted, textAlign: 'center' }}>{t.topic}</Text>
              </View>
            ))}
          </View>

          {/* Student rows */}
          {pageStudents.map((s) => {
            const { masteredPct } = summarizeStudentMastery(s.topicStatus);
            return (
              <View key={s.id} testID={`heatmap-row-${s.id}`} style={{ flexDirection: 'row', height: ROW_HEIGHT, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor + '80' }}>
                <View style={{ width: NAME_COL_WIDTH, paddingRight: 8 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: colors.textMain }}>{s.name}</Text>
                  <Text style={{ fontSize: 10.5, color: colors.textDim }}>{masteredPct}% mastered</Text>
                </View>
                {pageTopics.map((t) => {
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
        <Text style={{ fontSize: 11, color: colors.textDim }}>
          Showing {pageStudents.length} of {students.length} student{students.length === 1 ? '' : 's'}
        </Text>
        {students.length > STUDENTS_PER_PAGE && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 11, color: colors.textDim }}>Rows per page: {STUDENTS_PER_PAGE}</Text>
            <TouchableOpacity testID="heatmap-student-page-prev" disabled={safeStudentPage === 0} onPress={() => setStudentPage((p) => Math.max(0, p - 1))}>
              <Feather name="chevron-left" size={16} color={safeStudentPage === 0 ? colors.borderColor : colors.textMain} />
            </TouchableOpacity>
            <TouchableOpacity testID="heatmap-student-page-next" disabled={safeStudentPage >= maxStudentPage} onPress={() => setStudentPage((p) => Math.min(maxStudentPage, p + 1))}>
              <Feather name="chevron-right" size={16} color={safeStudentPage >= maxStudentPage ? colors.borderColor : colors.textMain} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
