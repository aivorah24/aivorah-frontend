import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { StudentLearningPathContent } from '../types';

const gradeLabel = (g?: string) => (g ? `Grade ${String(g).replace(/^grade\s*/i, '')}` : undefined);

// A teacher-published path as the student sees it: units, then one row per topic that opens the lesson screen
// (Learn / AI Tutor or Listen / Practice) with the teacher's content.
export default function TeacherPathTopics({
  content, pathKey, colors, navigation, fallbackGrade, fallbackSubject, fallbackCurriculum = 'CBSE',
}: {
  content: StudentLearningPathContent;
  pathKey: string;
  colors: AppColors;
  navigation: any;
  fallbackGrade?: string;
  fallbackSubject?: string;
  fallbackCurriculum?: string;
}) {
  const meta = content.metadata;
  const grade = gradeLabel(meta?.grade) || fallbackGrade;
  const subject = meta?.subject || fallbackSubject;
  return (
    <View style={{ gap: 14 }}>
      {content.units.map((unit, ui) => (
        <View key={ui} testID={`teacher-lp-unit-${ui}`} style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>{unit.title || `Unit ${ui + 1}`}</Text>
          {unit.topics.map((topic, ti) => {
            const canOpen = !!topic.content && !!grade && !!subject;
            return (
              <TouchableOpacity
                key={ti}
                testID={`teacher-topic-${pathKey}-${ui}-${ti}`}
                disabled={!canOpen}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('LessonScreen', {
                  grade,
                  subject,
                  curriculum: meta?.curriculum || fallbackCurriculum,
                  chapterIndex: unit.order,
                  topicIndex: topic.order,
                  chapterTitle: unit.title || undefined,
                  topicName: topic.title || 'This topic',
                  teacherContent: topic.content,
                })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, opacity: canOpen ? 1 : 0.55 }}
              >
                <Feather name="book-open" size={15} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMain }}>{topic.title || 'Topic'}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.textMuted }}>{canOpen ? (/math/i.test(subject || '') ? 'Learn · AI Tutor · Practice' : 'Learn · Listen · Practice') : 'Being prepared by your teacher'}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
