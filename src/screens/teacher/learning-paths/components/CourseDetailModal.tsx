import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { TeacherCourse } from '../../../../data/teacherCourses';

interface Props {
  active: TeacherCourse | null;
  colors: AppColors;
  gold: string;
  styles: any;
  onClose: () => void;
}

export default function CourseDetailModal({ active, colors, gold, styles, onClose }: Props) {
  return (
    <Modal testID="teacher-learning-paths-course-modal-root" visible={!!active} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View testID="teacher-learning-paths-course-modal" style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{active?.title}</Text>
              <Text style={styles.modalSub}>{active?.desc}</Text>
            </View>
            <TouchableOpacity testID="teacher-learning-paths-course-modal-close" style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }} showsVerticalScrollIndicator={false}>
            {active?.lessons.map((lesson, i) => (
              <View key={i} testID={`teacher-learning-paths-lesson-${i}`} style={styles.lessonCard}>
                <View style={styles.lessonHead}>
                  <View style={styles.lessonNum}><Text style={styles.lessonNumText}>{i + 1}</Text></View>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <View style={styles.minPill}>
                    <Feather name="clock" size={10} color={colors.textDim} />
                    <Text style={styles.minText}>{lesson.minutes} min</Text>
                  </View>
                </View>
                {/* Aivorah-hosted video slot (placeholder until recorded) */}
                {lesson.videoUrl
                  ? (Platform.OS === 'web'
                      ? React.createElement('video', {
                          src: lesson.videoUrl, controls: true,
                          style: { width: '100%', borderRadius: 10, marginBottom: 8, background: '#000' },
                        })
                      : null)
                  : (
                    <View style={styles.videoPlaceholder}>
                      <Feather name="play-circle" size={22} color={gold} />
                      <Text style={styles.videoPlaceholderText}>Video lesson coming soon</Text>
                    </View>
                  )}

                {lesson.body.map((p, j) => (
                  <Text key={j} style={styles.lessonBody}>{p}</Text>
                ))}
                {!!lesson.bullets?.length && (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {lesson.bullets.map((b, k) => (
                      <View key={k} style={styles.bulletRow}>
                        <Feather name="check" size={13} color={gold} style={{ marginTop: 3 }} />
                        <Text style={styles.bulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {!!lesson.prompts?.length && (
                  <View style={{ gap: 6, marginTop: 4 }}>
                    <Text style={styles.promptsLabel}>Example prompts</Text>
                    {lesson.prompts.map((p, k) => (
                      <View key={k} style={styles.promptBox}>
                        <Feather name="terminal" size={12} color={colors.accentCyan} style={{ marginTop: 3 }} />
                        <Text style={styles.promptText}>{p}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {!!lesson.tip && (
                  <View style={styles.tipBox}>
                    <Feather name="zap" size={13} color={gold} />
                    <Text style={styles.tipText}>{lesson.tip}</Text>
                  </View>
                )}
              </View>
            ))}
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
