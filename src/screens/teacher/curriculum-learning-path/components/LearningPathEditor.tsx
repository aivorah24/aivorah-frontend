import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import type { AppColors } from '../../../../theme';
import { LearningPathContent, LearningPathTopic, TeacherTopicContent, TeacherPracticeQuestion } from '../types';
import StudentPreviewModal from './StudentPreviewModal';
import LessonScreen from '../../../student/learning-paths/lesson-screen/LessonScreen';
import type { SubtopicSectionPick } from '../services/curriculumLearningPathService';

interface Props {
  content: LearningPathContent;
  onChange: (content: LearningPathContent) => void;
  readOnly?: boolean;
  onRebuildTopic?: (unitOrder: number, topicOrder: number, picks: SubtopicSectionPick[]) => Promise<void>;
}

// The embedded student lesson never navigates (no Ask tab, Practice shown in place), so a no-op is enough.
const NO_NAVIGATION = { navigate: () => {}, goBack: () => {}, openDrawer: () => {} };

type Badge = { label: string; tone: 'ok' | 'warn' | 'info' };

function badgeFor(topic: LearningPathTopic): Badge {
  if (topic.status === 'needs_teacher_input') return { label: 'Needs your input', tone: 'warn' };
  if (topic.groundingSource === 'reference_sources') return { label: 'From reference material · check', tone: 'info' };
  if (topic.groundingSource === 'ncert_book') {
    return (topic.content as any)?.aiWrittenSubtopics?.length
      ? { label: 'Book + AI parts', tone: 'info' }
      : { label: 'From the book', tone: 'ok' };
  }
  return { label: 'AI-written · check', tone: 'info' };
}

// Teacher review: pick a topic on the left, see it exactly as the student will (same Learn / Listen / AI Tutor /
// Practice screen) on the right, and edit through the Edit panel. Edits go through onChange -> PUT learning-path.
export default function LearningPathEditor({ content, onChange, readOnly, onRebuildTopic }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selected, setSelected] = useState<{ ui: number; ti: number }>({ ui: 0, ti: 0 });
  const [editing, setEditing] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');

  // Retries one topic that came out without a lesson (e.g. the AI service was busy), keeping any book picks.
  async function regenerate() {
    if (!onRebuildTopic || !topic) return;
    setRegenerating(true);
    setRegenError('');
    try {
      const picks = topic.subtopics.map((s) => {
        const page = topic.content?.book?.pages?.find((p) => p.subtopic === s.title);
        return (page?.sections || []).map((x) => ({ pdfFile: x.pdfFile, title: x.title }));
      });
      await onRebuildTopic(unit.order, topic.order, picks.length ? picks : [[]]);
    } catch (e: any) {
      setRegenError(e.message || 'Could not generate this topic right now.');
    } finally {
      setRegenerating(false);
    }
  }

  const unit = content.units[selected.ui];
  const topic = unit?.topics[selected.ti];
  const grade = content.metadata?.grade || '';
  const gradeLabel = /^\d+$/.test(grade) ? `Grade ${grade}` : grade || 'Grade 6';
  const subject = content.metadata?.subject || '';
  const hasNcertBooks = /\b(cbse|ncert)\b/i.test(content.metadata?.curriculum || 'CBSE');

  function updateTopic(ui: number, ti: number, patch: Partial<LearningPathTopic>) {
    onChange({
      ...content,
      units: content.units.map((u, i) => (i !== ui ? u : { ...u, topics: u.topics.map((t, j) => (j === ti ? { ...t, ...patch } : t)) })),
    });
  }

  const tone = (b: Badge) => (b.tone === 'ok' ? colors.accentGreen : b.tone === 'warn' ? colors.accentRed : colors.primary);

  return (
    <View testID="learning-path-editor" style={styles.layout}>
      <ScrollView style={styles.sidebar} contentContainerStyle={{ gap: 14, padding: 12 }}>
        {content.units.map((u, ui) => (
          <View key={ui} testID={`unit-${ui}`} style={{ gap: 6 }}>
            <Text style={styles.unitTitle}>{u.title || `Unit ${ui + 1}`}</Text>
            {u.topics.map((t, ti) => {
              const active = ui === selected.ui && ti === selected.ti;
              const b = badgeFor(t);
              return (
                <TouchableOpacity
                  key={ti}
                  testID={`topic-${ui}-${ti}`}
                  onPress={() => { setSelected({ ui, ti }); setShowAdvice(false); setRegenError(''); }}
                  activeOpacity={0.7}
                  style={[styles.topicRow, active && { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
                >
                  <Text style={styles.topicRowTitle} numberOfLines={2}>{t.title || 'Untitled topic'}</Text>
                  <Text testID={`topic-badge-${ui}-${ti}`} style={[styles.badge, { color: tone(b) }]}>{b.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {topic && (
        <View style={styles.main}>
          <View style={styles.mainHeader}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.unitLabel}>{unit.title || `Unit ${selected.ui + 1}`}</Text>
              <TextInput
                testID={`topic-title-${selected.ui}-${selected.ti}`}
                value={topic.title || ''}
                onChangeText={(v) => updateTopic(selected.ui, selected.ti, { title: v })}
                editable={!readOnly}
                placeholder="Topic title"
                placeholderTextColor={colors.textMuted}
                style={styles.topicTitleInput}
              />
              <Text style={styles.hint}>This is exactly what students will see.</Text>
            </View>
            {!readOnly && (
              <TouchableOpacity testID={`edit-topic-${selected.ui}-${selected.ti}`} onPress={() => setEditing(true)} activeOpacity={0.8} style={styles.editBtn}>
                <Feather name="edit-3" size={14} color={colors.primary} />
                <Text style={styles.editBtnText}>{hasNcertBooks ? 'Edit · Change pages' : 'Edit'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {topic.status === 'needs_teacher_input' && (
            <View testID={`needs-input-banner-${selected.ui}-${selected.ti}`} style={styles.needsInput}>
              <Text style={styles.needsInputTitle}>Needs your input</Text>
              {!!topic.teacherHint && <Text testID={`teacher-hint-${selected.ui}-${selected.ti}`} style={styles.needsInputText}>{topic.teacherHint}</Text>}
            </View>
          )}
          {!!topic.quality?.issues?.length && topic.status !== 'needs_teacher_input' && (
            <View testID="quality-advice">
              <TouchableOpacity onPress={() => setShowAdvice((v) => !v)} activeOpacity={0.7}>
                <Text style={styles.aiNote}>
                  {showAdvice ? '▾' : '▸'} Suggestions to improve this topic ({topic.quality.issues.length})
                </Text>
              </TouchableOpacity>
              {showAdvice && topic.quality.issues.map((issue, i) => (
                <Text key={i} testID={`quality-advice-${i}`} style={styles.hint}>{'•'} {issue}</Text>
              ))}
            </View>
          )}
          {!!(topic.content as any)?.aiWrittenSubtopics?.length && (
            <Text testID="ai-written-note" style={styles.aiNote}>
              Not in the book, explained by AI — please check: {(topic.content as any).aiWrittenSubtopics.join(', ')}
            </Text>
          )}

          {topic.content ? (
            <LessonScreen
              key={`${selected.ui}-${selected.ti}`}
              embedded
              navigation={NO_NAVIGATION}
              route={{ params: { teacherContent: topic.content, topicName: topic.title || '', subject, grade: gradeLabel, curriculum: content.metadata?.curriculum || 'CBSE', chapterTitle: unit.title || '' } }}
              practiceSlot={<PracticePreview questions={topic.content.practiceQuiz || []} colors={colors} />}
            />
          ) : (
            <View testID="no-lesson-content" style={[styles.empty, { gap: 10 }]}>
              <Text style={styles.hint}>No lesson for this topic yet. Generate it again, or add it yourself in Edit.</Text>
              {!readOnly && !!onRebuildTopic && (
                <TouchableOpacity testID="regenerate-topic" disabled={regenerating} onPress={regenerate} activeOpacity={0.8} style={[styles.editBtn, { alignSelf: 'flex-start', opacity: regenerating ? 0.6 : 1 }]}>
                  <Feather name="refresh-cw" size={14} color={colors.primary} />
                  <Text style={styles.editBtnText}>{regenerating ? 'Generating… about a minute' : 'Generate lesson again'}</Text>
                </TouchableOpacity>
              )}
              {!!regenError && <Text testID="regenerate-error" style={{ fontSize: 12, color: colors.accentRed }}>{regenError}</Text>}
            </View>
          )}
        </View>
      )}

      {editing && topic && (
        <StudentPreviewModal
          topic={topic}
          colors={colors}
          pathGrade={content.metadata?.grade}
          subject={subject}
          curriculum={content.metadata?.curriculum}
          onClose={() => setEditing(false)}
          onChangeContent={readOnly ? undefined : (next: TeacherTopicContent) => updateTopic(selected.ui, selected.ti, { content: next })}
          onRebuild={readOnly || !onRebuildTopic ? undefined : (picks) => onRebuildTopic(unit.order, topic.order, picks)}
        />
      )}
    </View>
  );
}

// Practice as the student sees the questions, with the correct answer marked for the teacher.
function PracticePreview({ questions, colors }: { questions: TeacherPracticeQuestion[]; colors: AppColors }) {
  if (!questions.length) {
    return <Text style={{ fontSize: 13, color: colors.textMuted }}>No practice questions for this topic yet.</Text>;
  }
  return (
    <View testID="practice-preview" style={{ gap: 12 }}>
      {questions.map((q, i) => (
        <View key={i} style={{ borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.cardDark, borderRadius: 10, padding: 12, gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }}>{i + 1}. {q.question}</Text>
          {q.type === 'fill_blank' ? (
            <Text style={{ fontSize: 13, color: colors.accentGreen }}>Answer: {String(q.correct)}</Text>
          ) : q.options.map((o, k) => (
            <Text key={k} style={{ fontSize: 13, color: k === q.correct ? colors.accentGreen : colors.textMain }}>
              {k === q.correct ? '✓ ' : '○ '}{o}
            </Text>
          ))}
          {!!q.explanation && <Text style={{ fontSize: 12, color: colors.textMuted }}>{q.explanation}</Text>}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  layout: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  sidebar: { width: 260, maxHeight: 900, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 12, backgroundColor: colors.cardDark },
  unitTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: colors.textMuted, textTransform: 'uppercase' },
  topicRow: { borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 10, gap: 4 },
  topicRowTitle: { fontSize: 13.5, fontWeight: '700', color: colors.textMain },
  badge: { fontSize: 11, fontWeight: '700' },
  main: { flex: 1, gap: 10, minWidth: 0 },
  mainHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  unitLabel: { fontSize: 12, color: colors.textMuted },
  topicTitleInput: { fontSize: 20, fontWeight: '800', color: colors.textMain, paddingVertical: 2 },
  hint: { fontSize: 12, color: colors.textMuted },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  needsInput: { borderWidth: 1, borderColor: colors.accentRed + '66', backgroundColor: colors.accentRed + '12', borderRadius: 10, padding: 10, gap: 4 },
  needsInputTitle: { fontSize: 12, fontWeight: '800', color: colors.accentRed },
  needsInputText: { fontSize: 13, color: colors.textMain },
  aiNote: { fontSize: 12.5, color: colors.primary },
  empty: { borderWidth: 1, borderColor: colors.borderColor, borderRadius: 12, padding: 24 },
});
