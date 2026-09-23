import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import type { AppColors } from '../../../../theme';
import { LearningPathContent, LearningPathTopic } from '../types';
import StudentPreviewModal from './StudentPreviewModal';

interface Props {
  content: LearningPathContent;
  onChange: (content: LearningPathContent) => void;
  readOnly?: boolean;
}

// Whole-document edit pattern: mutate a deep copy, then call onChange with the
// full content — same convention as InteractiveQuizPreviewModal.tsx's
// question editing, so this saves through PUT /:id/learning-path the same way.
export default function LearningPathEditor({ content, onChange, readOnly }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [previewTopic, setPreviewTopic] = useState<LearningPathTopic | null>(null);
  const [expandedQuality, setExpandedQuality] = useState<string | null>(null);

  function updateUnitTitle(ui: number, title: string) {
    const next = { ...content, units: content.units.map((u, i) => (i === ui ? { ...u, title } : u)) };
    onChange(next);
  }

  function updateTopicTitle(ui: number, ti: number, title: string) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return { ...u, topics: u.topics.map((t, j) => (j === ti ? { ...t, title } : t)) };
    });
    onChange(next);
  }

  function updateObjective(ui: number, ti: number, oi: number, value: string) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return {
        ...u,
        topics: u.topics.map((t, j) => {
          if (j !== ti) return t;
          return { ...t, objectives: t.objectives.map((o, k) => (k === oi ? value : o)) };
        }),
      };
    });
    onChange(next);
  }

  function addObjective(ui: number, ti: number) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return {
        ...u,
        topics: u.topics.map((t, j) => (j === ti ? { ...t, objectives: [...t.objectives, ''] } : t)),
      };
    });
    onChange(next);
  }

  function removeObjective(ui: number, ti: number, oi: number) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return {
        ...u,
        topics: u.topics.map((t, j) => (j === ti ? { ...t, objectives: t.objectives.filter((_, k) => k !== oi) } : t)),
      };
    });
    onChange(next);
  }

  function updateLesson(ui: number, ti: number, li: number, field: 'title' | 'summary', value: string) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return {
        ...u,
        topics: u.topics.map((t, j) => {
          if (j !== ti) return t;
          return { ...t, lessons: t.lessons.map((l, k) => (k === li ? { ...l, [field]: value } : l)) };
        }),
      };
    });
    onChange(next);
  }

  function addLesson(ui: number, ti: number) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return {
        ...u,
        topics: u.topics.map((t, j) => (j === ti ? { ...t, lessons: [...t.lessons, { title: '', summary: '' }] } : t)),
      };
    });
    onChange(next);
  }

  function removeImageBlock(ui: number, ti: number, blockIndex: number) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return {
        ...u,
        topics: u.topics.map((t, j) => {
          if (j !== ti || !t.content) return t;
          return { ...t, content: { ...t.content, blocks: t.content.blocks.filter((_, k) => k !== blockIndex) } };
        }),
      };
    });
    onChange(next);
  }

  function removeLesson(ui: number, ti: number, li: number) {
    const next = { ...content };
    next.units = content.units.map((u, i) => {
      if (i !== ui) return u;
      return {
        ...u,
        topics: u.topics.map((t, j) => (j === ti ? { ...t, lessons: t.lessons.filter((_, k) => k !== li) } : t)),
      };
    });
    onChange(next);
  }

  return (
    <View testID="learning-path-editor">
      {content.units.map((unit, ui) => (
        <View key={ui} testID={`unit-${ui}`} style={styles.unit}>
          <TextInput
            testID={`unit-title-${ui}`}
            value={unit.title || ''}
            onChangeText={(v) => updateUnitTitle(ui, v)}
            placeholder="Unit title"
            placeholderTextColor={colors.textMuted}
            editable={!readOnly}
            style={styles.unitTitleInput}
          />
          {unit.topics.map((topic, ti) => (
            <View key={ti} testID={`topic-${ui}-${ti}`} style={styles.topic}>
              <TextInput
                testID={`topic-title-${ui}-${ti}`}
                value={topic.title || ''}
                onChangeText={(v) => updateTopicTitle(ui, ti, v)}
                placeholder="Topic title"
                placeholderTextColor={colors.textMuted}
                editable={!readOnly}
                style={styles.topicTitleInput}
              />

              <TouchableOpacity testID={`preview-as-student-${ui}-${ti}`} onPress={() => setPreviewTopic(topic)}>
                <Text style={styles.previewText}>Preview as student</Text>
              </TouchableOpacity>

              {topic.groundingSource === 'model_knowledge' && (
                <Text testID={`model-knowledge-note-${ui}-${ti}`} style={styles.modelKnowledgeNote}>
                  Generated from AI knowledge — please review
                </Text>
              )}

              {topic.status === 'needs_teacher_input' && (
                <View testID={`needs-input-banner-${ui}-${ti}`} style={styles.needsInputBanner}>
                  <Text style={styles.needsInputBadge}>Needs your input</Text>
                  {!!topic.teacherHint && (
                    <Text testID={`teacher-hint-${ui}-${ti}`} style={styles.needsInputHint}>{topic.teacherHint}</Text>
                  )}
                </View>
              )}

              {!!topic.content?.blocks?.length && (() => {
                const imageBlocks = topic.content!.blocks
                  .map((b, blockIndex) => ({ b, blockIndex }))
                  .filter(({ b }) => b.type === 'image');
                return (
                  <View testID={`visuals-${ui}-${ti}`} style={styles.visualsRow}>
                    <Text style={styles.sectionLabel}>Visuals: {imageBlocks.length}</Text>
                    {!readOnly && imageBlocks.map(({ blockIndex }, idx) => (
                      <TouchableOpacity
                        key={blockIndex}
                        testID={`remove-image-${ui}-${ti}-${idx}`}
                        onPress={() => removeImageBlock(ui, ti, blockIndex)}
                      >
                        <Text style={styles.removeText}>Remove image {idx + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })()}

              {!!topic.quality && (() => {
                const key = `${ui}-${ti}`;
                const issueCount = topic.quality!.issues.length;
                const expanded = expandedQuality === key;
                return (
                  <View testID={`grade-fit-${ui}-${ti}`}>
                    <TouchableOpacity onPress={() => setExpandedQuality(expanded ? null : key)}>
                      <Text style={issueCount === 0 ? styles.gradeFitOk : styles.gradeFitWarn}>
                        {issueCount === 0 ? 'Grade fit ✓' : `⚠ ${issueCount} issue${issueCount === 1 ? '' : 's'}`}
                      </Text>
                    </TouchableOpacity>
                    {expanded && issueCount > 0 && (
                      <View testID={`grade-fit-issues-${ui}-${ti}`}>
                        {topic.quality!.issues.map((issue, ii) => (
                          <Text key={ii} style={styles.gradeFitIssue}>{`• ${issue}`}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })()}

              <Text style={styles.sectionLabel}>Objectives</Text>
              {topic.objectives.map((objective, oi) => (
                <View key={oi} style={styles.row}>
                  <TextInput
                    testID={`objective-${ui}-${ti}-${oi}`}
                    value={objective}
                    onChangeText={(v) => updateObjective(ui, ti, oi, v)}
                    editable={!readOnly}
                    style={styles.flexInput}
                  />
                  {!readOnly && (
                    <TouchableOpacity testID={`remove-objective-${ui}-${ti}-${oi}`} onPress={() => removeObjective(ui, ti, oi)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {!readOnly && (
                <TouchableOpacity testID={`add-objective-${ui}-${ti}`} onPress={() => addObjective(ui, ti)}>
                  <Text style={styles.addText}>+ Add objective</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.sectionLabel}>Lessons</Text>
              {topic.lessons.map((lesson, li) => (
                <View key={li} style={styles.lessonBlock}>
                  <TextInput
                    testID={`lesson-title-${ui}-${ti}-${li}`}
                    value={lesson.title}
                    onChangeText={(v) => updateLesson(ui, ti, li, 'title', v)}
                    placeholder="Lesson title"
                    placeholderTextColor={colors.textMuted}
                    editable={!readOnly}
                    style={styles.flexInput}
                  />
                  <TextInput
                    testID={`lesson-summary-${ui}-${ti}-${li}`}
                    value={lesson.summary}
                    onChangeText={(v) => updateLesson(ui, ti, li, 'summary', v)}
                    placeholder="Lesson summary"
                    placeholderTextColor={colors.textMuted}
                    editable={!readOnly}
                    multiline
                    style={styles.flexInput}
                  />
                  {!readOnly && (
                    <TouchableOpacity testID={`remove-lesson-${ui}-${ti}-${li}`} onPress={() => removeLesson(ui, ti, li)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {!readOnly && (
                <TouchableOpacity testID={`add-lesson-${ui}-${ti}`} onPress={() => addLesson(ui, ti)}>
                  <Text style={styles.addText}>+ Add lesson</Text>
                </TouchableOpacity>
              )}

              {topic.subtopics.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Subtopics</Text>
                  {topic.subtopics.map((subtopic, si) => (
                    <Text key={si} testID={`subtopic-${ui}-${ti}-${si}`} style={styles.subtopicText}>
                      {subtopic.title}
                    </Text>
                  ))}
                </>
              )}
            </View>
          ))}
        </View>
      ))}
      {previewTopic && (
        <StudentPreviewModal topic={previewTopic} colors={colors} onClose={() => setPreviewTopic(null)} />
      )}
    </View>
  );
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  unit: { marginBottom: 16 },
  unitTitleInput: { fontSize: 18, fontWeight: '600', paddingVertical: 6, color: colors.textMain },
  topic: { marginLeft: 12, marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.borderColor },
  topicTitleInput: { fontSize: 15, fontWeight: '500', paddingVertical: 4, color: colors.textMain },
  previewText: { fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  modelKnowledgeNote: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted, marginBottom: 4 },
  needsInputBanner: {
    backgroundColor: colors.accentYellowGlow,
    borderWidth: 1,
    borderColor: colors.accentOrange,
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    marginBottom: 4,
    gap: 4,
  },
  needsInputBadge: { fontSize: 11, fontWeight: '700', color: colors.accentOrange, textTransform: 'uppercase' },
  needsInputHint: { fontSize: 13, color: colors.textMain },
  sectionLabel: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  gradeFitOk: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  gradeFitWarn: { fontSize: 12, color: colors.accentOrange, fontWeight: '600', marginTop: 4 },
  gradeFitIssue: { fontSize: 12, color: colors.textMuted, marginLeft: 4, marginTop: 2 },
  visualsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexInput: { flex: 1, paddingVertical: 4, color: colors.textMain },
  lessonBlock: { marginTop: 4 },
  addText: { color: colors.primary, marginTop: 4 },
  removeText: { color: colors.accentRed, marginLeft: 8 },
  subtopicText: { fontSize: 13, color: colors.textMuted, marginLeft: 4 },
});
