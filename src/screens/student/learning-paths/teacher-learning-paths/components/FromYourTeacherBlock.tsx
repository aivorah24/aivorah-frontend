import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { listTeacherLearningPaths, getTeacherLearningPath } from '../services/studentLearningPathService';
import { StudentTeacherLearningPath, TeacherLearningPathSummary } from '../types';

type Loaded = { summary: TeacherLearningPathSummary; path: StudentTeacherLearningPath };

// Top of a subject screen: the learning path(s) the student's teacher published for this grade and subject.
// Each topic opens the same Learn / AI Tutor / Practice lesson screen. Renders nothing when there are none.
export default function FromYourTeacherBlock({
  grade, subject, curriculum, colors, navigation,
}: { grade: string; subject: string; curriculum: string; colors: AppColors; navigation: any }) {
  const [paths, setPaths] = useState<Loaded[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { learningPaths } = await listTeacherLearningPaths({ grade, subject });
        const loaded = await Promise.all(learningPaths.map(async (summary) => {
          const { learningPath } = await getTeacherLearningPath(summary.curriculumId);
          return { summary, path: learningPath };
        }));
        if (!cancelled) setPaths(loaded);
      } catch {
        // Same quiet convention as the rest of the subject screen: no teacher path simply means nothing to show.
      }
    })();
    return () => { cancelled = true; };
  }, [grade, subject]);

  if (!paths.length) return null;

  return (
    <View testID="from-your-teacher" style={{ gap: 12, marginBottom: 16 }}>
      {paths.map(({ summary, path }) => (
        <View key={summary.id} style={{ borderWidth: 1, borderColor: colors.primary + '55', backgroundColor: colors.primary + '0D', borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="user-check" size={15} color={colors.primary} />
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: colors.primary }}>FROM YOUR TEACHER</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain }}>{summary.title}</Text>
          {path.content.units.map((unit, ui) => (
            <View key={ui} style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>{unit.title || `Unit ${ui + 1}`}</Text>
              {unit.topics.map((topic, ti) => {
                const canOpen = !!topic.content;
                return (
                  <TouchableOpacity
                    key={ti}
                    testID={`teacher-topic-${summary.curriculumId}-${ui}-${ti}`}
                    disabled={!canOpen}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('LessonScreen', {
                      grade: path.content.metadata?.grade ? `Grade ${String(path.content.metadata.grade).replace(/^grade\s*/i, '')}` : grade,
                      subject: path.content.metadata?.subject || subject,
                      curriculum: path.content.metadata?.curriculum || curriculum,
                      chapterIndex: unit.order,
                      topicIndex: topic.order,
                      chapterTitle: unit.title || undefined,
                      topicName: topic.title || 'This topic',
                      teacherContent: topic.content,
                    })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, opacity: canOpen ? 1 : 0.55 }}
                  >
                    <Feather name="book-open" size={15} color={colors.primary} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.textMain }}>{topic.title || 'Topic'}</Text>
                    <Feather name="chevron-right" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
