import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import LearningBlocks from '../../../student/learning-paths/lesson-screen/components/LearningBlocks';
import { LearningPathTopic } from '../types';

// Renders exactly what the student will see for this topic once published —
// reuses LearningBlocks.tsx as-is (the same renderer the student Learn tab
// uses for this block schema) rather than duplicating block-rendering logic.
// A topic with no grounded content (content: null — the upload_text_only or
// needs_teacher_input case) has no blocks to show, so this falls back to a
// plain objectives/lessons view instead of an empty screen.
export default function StudentPreviewModal({ topic, colors, onClose }: { topic: LearningPathTopic; colors: AppColors; onClose: () => void }) {
  const hasBlocks = !!topic.content?.blocks?.length || !!topic.content?.whatYoullLearn?.length;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', borderWidth: 1, borderBottomWidth: 0, borderColor: colors.borderColor }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="eye" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: '800', color: colors.textMain }} numberOfLines={1}>{topic.title || 'Topic preview'}</Text>
              <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted }}>Student preview</Text>
            </View>
            <TouchableOpacity testID="close-student-preview" onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView testID="student-preview-scroll" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
            {hasBlocks ? (
              <LearningBlocks whatYoullLearn={topic.content?.whatYoullLearn} blocks={topic.content?.blocks || []} colors={colors} />
            ) : (
              <View testID="student-preview-fallback" style={{ gap: 16 }}>
                {topic.objectives.length > 0 && (
                  <View style={{ backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '40', borderRadius: 10, padding: 12, gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.primary }}>WHAT YOU&apos;LL LEARN</Text>
                    {topic.objectives.map((o, i) => (
                      <Text key={i} style={{ fontSize: 13, color: colors.textMain }}>{'•'} {o}</Text>
                    ))}
                  </View>
                )}
                {topic.lessons.map((lesson, i) => (
                  <View key={i} style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 10, padding: 12, gap: 6 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textMain }}>{lesson.title}</Text>
                    {!!lesson.summary && <Text style={{ fontSize: 13.5, lineHeight: 20, color: colors.textMain }}>{lesson.summary}</Text>}
                  </View>
                ))}
                {topic.objectives.length === 0 && topic.lessons.length === 0 && (
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>Nothing to preview yet for this topic.</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
