import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { LearningPathContent } from '../types';

interface Props {
  content: LearningPathContent;
  onChange: (content: LearningPathContent) => void;
  readOnly?: boolean;
}

// Whole-document edit pattern: mutate a deep copy, then call onChange with the
// full content — same convention as InteractiveQuizPreviewModal.tsx's
// question editing, so this saves through PUT /:id/learning-path the same way.
export default function LearningPathEditor({ content, onChange, readOnly }: Props) {
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
                editable={!readOnly}
                style={styles.topicTitleInput}
              />

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
                    editable={!readOnly}
                    style={styles.flexInput}
                  />
                  <TextInput
                    testID={`lesson-summary-${ui}-${ti}-${li}`}
                    value={lesson.summary}
                    onChangeText={(v) => updateLesson(ui, ti, li, 'summary', v)}
                    placeholder="Lesson summary"
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
    </View>
  );
}

const styles = StyleSheet.create({
  unit: { marginBottom: 16 },
  unitTitleInput: { fontSize: 18, fontWeight: '600', paddingVertical: 6 },
  topic: { marginLeft: 12, marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#ccc' },
  topicTitleInput: { fontSize: 15, fontWeight: '500', paddingVertical: 4 },
  sectionLabel: { fontSize: 12, opacity: 0.7, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexInput: { flex: 1, paddingVertical: 4 },
  lessonBlock: { marginTop: 4 },
  addText: { color: '#3B82F6', marginTop: 4 },
  removeText: { color: '#EF4444', marginLeft: 8 },
  subtopicText: { fontSize: 13, opacity: 0.8, marginLeft: 4 },
});
