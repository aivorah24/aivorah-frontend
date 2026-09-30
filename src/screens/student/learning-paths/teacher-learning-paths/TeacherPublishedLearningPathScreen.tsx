import React, { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../../components/common/Header';
import ScreenLayout from '../../../../components/common/ScreenLayout';
import { useTheme } from '../../../../context/ThemeContext';
import type { AppColors } from '../../../../theme';
import { useTeacherLearningPath } from './hooks/useTeacherLearningPath';
import TeacherPathTopics from './components/TeacherPathTopics';

interface Props {
  route: { params: { curriculumId: string; title: string } };
  navigation: any;
}

export default function TeacherPublishedLearningPathScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { curriculumId, title } = route.params;
  const { learningPath, status, errorMessage } = useTeacherLearningPath(curriculumId);

  return (
    <ScreenLayout>
      <Header title={title || 'Learning Path'} onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={styles.container}>
        {status === 'loading' && <ActivityIndicator testID="teacher-lp-detail-loading" color={colors.primary} />}

        {status === 'not_found' && (
          <Text testID="teacher-lp-detail-not-found" style={styles.dimText}>
            This learning path isn&apos;t available right now.
          </Text>
        )}

        {status === 'forbidden' && (
          <Text testID="teacher-lp-detail-forbidden" style={styles.dimText}>
            You don&apos;t have access to this learning path.
          </Text>
        )}

        {status === 'error' && (
          <Text testID="teacher-lp-detail-error" style={styles.errorText}>{errorMessage}</Text>
        )}

        {status === 'ok' && learningPath && learningPath.content.units.length === 0 && (
          <Text testID="teacher-lp-detail-empty" style={styles.dimText}>This learning path has no content yet.</Text>
        )}

        {status === 'ok' && learningPath && learningPath.content.units.length > 0 && (
          <TeacherPathTopics content={learningPath.content} pathKey={curriculumId} colors={colors} navigation={navigation} />
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: { padding: 16 },
  unit: { marginBottom: 20 },
  unitTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: colors.textMain },
  topic: { marginLeft: 12, marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.borderColor },
  topicTitle: { fontSize: 15, fontWeight: '600', color: colors.textMain },
  block: { marginTop: 4 },
  blockLabel: { fontSize: 12, color: colors.textMuted },
  item: { fontSize: 13, marginLeft: 4, color: colors.textMain },
  lessonTitle: { fontSize: 14, fontWeight: '500', marginTop: 4, color: colors.textMain },
  dimText: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  errorText: { color: colors.accentRed, textAlign: 'center', marginTop: 40 },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    marginTop: 8, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 18,
    backgroundColor: colors.primary,
  },
  openBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
