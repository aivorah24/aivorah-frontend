import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../../context/ThemeContext';
import type { AppColors } from '../../../../../theme';
import { useTeacherLearningPaths } from '../hooks/useTeacherLearningPaths';

interface Props {
  onOpen: (curriculumId: string, title: string) => void;
}

// Deliberately a separate section from the national-curriculum Subjects grid
// on LearningPathsScreen — teacher-published content has a different shape
// (units/topics/lessons, no per-topic completion tracking) and a different
// authorization model, so it is never merged into the subjects array.
//
// Renders nothing while loading, on error, or when empty — same
// degrade-quietly convention as the national curriculum's own subjects fetch
// (a backend hiccup here must read as "nothing published yet", not a broken
// dashboard); the loading/error states themselves are exercised directly via
// useTeacherLearningPaths's own tests, and explicitly surfaced on the
// dedicated TeacherPublishedLearningPathScreen once a student opens one.
export default function TeacherLearningPathsSection({ onOpen }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { learningPaths, loading, error } = useTeacherLearningPaths();

  if (loading || error || learningPaths.length === 0) {
    return null;
  }

  return (
    <View testID="teacher-lp-section" style={styles.container}>
      <Text style={styles.sectionTitle}>From Your Teacher</Text>
      {learningPaths.map((lp) => (
        <TouchableOpacity
          key={lp.id}
          testID={`teacher-lp-item-${lp.curriculumId}`}
          style={styles.card}
          onPress={() => onOpen(lp.curriculumId, lp.title)}
        >
          <Feather name="book-open" size={16} color={colors.primary} />
          <Text style={styles.cardTitle}>{lp.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: colors.textMain },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '500', color: colors.textMain },
});
