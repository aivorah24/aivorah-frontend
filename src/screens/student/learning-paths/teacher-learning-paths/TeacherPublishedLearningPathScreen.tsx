import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import Header from '../../../../components/common/Header';
import ScreenLayout from '../../../../components/common/ScreenLayout';
import { useTeacherLearningPath } from './hooks/useTeacherLearningPath';

interface Props {
  route: { params: { curriculumId: string; title: string } };
  navigation: any;
}

export default function TeacherPublishedLearningPathScreen({ route, navigation }: Props) {
  const { curriculumId, title } = route.params;
  const { learningPath, status, errorMessage } = useTeacherLearningPath(curriculumId);

  return (
    <ScreenLayout>
      <Header title={title || 'Learning Path'} onMenuPress={() => navigation.openDrawer?.()} />
      <ScrollView contentContainerStyle={styles.container}>
        {status === 'loading' && <ActivityIndicator testID="teacher-lp-detail-loading" />}

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
            {unit.topics.map((topic, ti) => (
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
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  unit: { marginBottom: 20 },
  unitTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  topic: { marginLeft: 12, marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#ccc' },
  topicTitle: { fontSize: 15, fontWeight: '600' },
  block: { marginTop: 4 },
  blockLabel: { fontSize: 12, opacity: 0.7 },
  item: { fontSize: 13, marginLeft: 4 },
  lessonTitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  dimText: { opacity: 0.7, textAlign: 'center', marginTop: 40 },
  errorText: { color: '#EF4444', textAlign: 'center', marginTop: 40 },
});
