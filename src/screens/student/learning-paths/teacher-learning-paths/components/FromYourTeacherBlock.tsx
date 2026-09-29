import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../../theme';
import { listTeacherLearningPaths, getTeacherLearningPath } from '../services/studentLearningPathService';
import { StudentTeacherLearningPath, TeacherLearningPathSummary } from '../types';
import TeacherPathTopics from './TeacherPathTopics';

type Loaded = { summary: TeacherLearningPathSummary; path: StudentTeacherLearningPath };

// Top of a subject screen: the learning path(s) the student's teacher published for this grade and subject.
// Renders nothing when there are none; onFound lets the screen know teacher lessons exist.
export default function FromYourTeacherBlock({
  grade, subject, curriculum, colors, navigation, onFound,
}: { grade: string; subject: string; curriculum: string; colors: AppColors; navigation: any; onFound?: (found: boolean) => void }) {
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
        if (!cancelled) { setPaths(loaded); onFound?.(loaded.length > 0); }
      } catch {
        // Same quiet convention as the rest of the subject screen: no teacher path simply means nothing to show.
        if (!cancelled) onFound?.(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <TeacherPathTopics
            content={path.content}
            pathKey={summary.curriculumId}
            colors={colors}
            navigation={navigation}
            fallbackGrade={grade}
            fallbackSubject={subject}
            fallbackCurriculum={curriculum}
          />
        </View>
      ))}
    </View>
  );
}
