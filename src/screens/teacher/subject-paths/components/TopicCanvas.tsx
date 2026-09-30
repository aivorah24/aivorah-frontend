import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import LessonScreen from '../../../student/learning-paths/lesson-screen/LessonScreen';
import { useDbTopic } from '../../../student/learning-paths/lesson-screen/hooks/useDbTopic';
import { LESSON_FIELDS_ORDER, lessonAsTeacherContent, type EditedTopic, type LessonEdit } from '../../../student/learning-paths/subject-syllabus/subjectEdits';
import LessonEditor from './LessonEditor';

const noopNavigation = { navigate: () => {}, goBack: () => {}, openDrawer: () => {}, setParams: () => {} };

// The lesson fields a teacher can change, taken from what students get today.
function lessonFrom(payload: any): LessonEdit {
  const out: any = {};
  for (const f of LESSON_FIELDS_ORDER) if (payload?.[f] !== undefined && payload?.[f] !== null) out[f] = JSON.parse(JSON.stringify(payload[f]));
  return out;
}

function PracticeList({ lesson, colors }: { lesson: LessonEdit; colors: AppColors }) {
  const quiz = lesson.practiceQuiz || [];
  if (!quiz.length) return <Text style={{ fontSize: 13, color: colors.textMuted }}>No practice questions yet — students get questions made from the lesson.</Text>;
  return (
    <View style={{ gap: 10 }}>
      {quiz.map((q, i) => (
        <View key={i} style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 4 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textMain }}>{i + 1}. {q.question}</Text>
          {q.options.map((o, oi) => (
            <Text key={oi} style={{ fontSize: 13, color: oi === q.correctIndex ? colors.accentGreen : colors.textMain }}>{oi === q.correctIndex ? '✓ ' : '• '}{o}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

// One topic: "Edit" shows every part as editable; "Student view" shows it exactly as students will see it.
export default function TopicCanvas({
  topic, chapterTitle, curriculum, grade, subject, colors, onChangeLesson, onResetLesson,
}: {
  topic: EditedTopic;
  chapterTitle: string;
  curriculum: string;
  grade: string;
  subject: string;
  colors: AppColors;
  onChangeLesson: (lesson: LessonEdit) => void;
  onResetLesson: () => void;
}) {
  const [mode, setMode] = useState<'edit' | 'view'>('edit');
  const isMath = /math/i.test(subject);
  const topicId = topic.id && topic.kind !== 'qdrant' && topic.kind !== 'section' ? String(topic.id) : undefined;
  const byName = !topic.added && !topicId ? { curriculum, grade, subject, topic: topic.baseName || topic.name } : undefined;
  const { rawPayload, loadingDbTopic } = useDbTopic(topicId, topic.name, byName, { enabled: !topic.added });

  const original = useMemo(() => lessonFrom(rawPayload), [rawPayload]);
  const lesson = topic.lessonEdit || original;
  const edited = !!topic.lessonEdit && !topic.added;

  const viewParams = topic.added
    ? { teacherContent: lessonAsTeacherContent(lesson), topicName: topic.name }
    : { topicId, byNameTopic: byName ? byName.topic : undefined, topicName: topic.name, lessonEdits: topic.lessonEdit };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{chapterTitle}</Text>
          <Text style={{ fontSize: 19, fontWeight: '800', color: colors.textMain }}>{topic.name}</Text>
          <Text style={{ fontSize: 12, color: edited || topic.added ? colors.primary : colors.textMuted, marginTop: 2 }}>
            {topic.added ? 'Your own topic' : edited ? 'Edited by you — students see your version' : 'Standard lesson — edit anything to make it yours'}
          </Text>
        </View>
        {edited && (
          <TouchableOpacity testID="reset-lesson" onPress={onResetLesson} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7 }}>
            <Feather name="rotate-ccw" size={13} color={colors.textMuted} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.textMuted }}>Reset to original</Text>
          </TouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' }}>
          {([['edit', 'Edit', 'edit-2'], ['view', 'Student view', 'eye']] as const).map(([key, label, icon]) => (
            <TouchableOpacity key={key} testID={`canvas-${key}`} onPress={() => setMode(key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: mode === key ? colors.primary : 'transparent' }}>
              <Feather name={icon} size={13} color={mode === key ? '#fff' : colors.textMuted} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: mode === key ? '#fff' : colors.textMuted }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loadingDbTopic && !topic.lessonEdit ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : mode === 'edit' ? (
        <LessonEditor lesson={lesson} isMath={isMath} grade={grade} subject={subject} colors={colors} onChange={onChangeLesson} />
      ) : (
        <LessonScreen
          key={topic.editKey}
          embedded
          navigation={noopNavigation}
          practiceSlot={<PracticeList lesson={lesson} colors={colors} />}
          route={{ params: { subject, grade, curriculum, chapterTitle, ...viewParams } }}
        />
      )}
    </View>
  );
}
