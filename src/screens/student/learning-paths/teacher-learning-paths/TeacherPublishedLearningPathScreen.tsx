import React, { useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../../../../components/common/Header';
import ScreenLayout from '../../../../components/common/ScreenLayout';
import { useTheme } from '../../../../context/ThemeContext';
import type { AppColors } from '../../../../theme';
import { useTeacherLearningPath } from './hooks/useTeacherLearningPath';

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

        {status === 'ok' && learningPath && learningPath.content.units.map((unit, ui) => (
          <View key={ui} testID={`teacher-lp-unit-${ui}`} style={styles.unit}>
            <Text style={styles.unitTitle}>{unit.title || 'Untitled Unit'}</Text>
            {unit.topics.map((topic, ti) => {
              const metadata = learningPath.content.metadata;
              // AI Tutor/Listen/Ask Aivorah/Practice all need grade+subject to
              // resolve grounded context — a topic with no generated content
              // yet (still awaiting AI generation) also has nothing to open.
              const canOpen = !!topic.content && !!metadata?.grade && !!metadata?.subject;
              return (
                <View key={ti} testID={`teacher-lp-topic-${ui}-${ti}`} style={styles.topic}>
                  <Text style={styles.topicTitle}>{topic.title || 'Untitled Topic'}</Text>
                  {topic.objectives.length > 0 && (
                    <View style={styles.block}>
                      <Text style={styles.blockLabel}>What you&apos;ll learn</Text>
                      {topic.objectives.map((o, oi) => <Text key={oi} style={styles.item}>• {o}</Text>)}
                    </View>
                  )}
                  {topic.lessons.length > 0 && (
                    <View style={styles.block}>
                      <Text style={styles.blockLabel}>Lessons</Text>
                      {topic.lessons.map((l, li) => (
                        <View key={li} testID={`teacher-lp-lesson-${ui}-${ti}-${li}`}>
                          <Text style={styles.lessonTitle}>{l.title}</Text>
                          {!!l.summary && <Text style={styles.item}>{l.summary}</Text>}
                        </View>
                      ))}
                    </View>
                  )}
                  {canOpen && (
                    <TouchableOpacity
                      testID={`teacher-lp-open-${ui}-${ti}`}
                      style={styles.openBtn}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('LessonScreen', {
                        grade: metadata!.grade,
                        subject: metadata!.subject,
                        curriculum: metadata!.curriculum || 'CBSE',
                        chapterIndex: unit.order,
                        topicIndex: topic.order,
                        chapterTitle: unit.title || undefined,
                        topicName: topic.title || 'This topic',
                        teacherContent: topic.content,
                      })}
                    >
                      <Feather name="cpu" size={13} color="#fff" />
                      <Text style={styles.openBtnText}>Learn · AI Tutor · Ask Aivorah · Practice</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))}
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
