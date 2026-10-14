import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import LearningBlocks from '../../../student/learning-paths/lesson-screen/components/LearningBlocks';
import BookSidePane from './BookSidePane';
import { isCbseCurriculum } from '../../../../utils/curriculum';

// NCERT book sections can only be picked for curricula that follow the NCERT books (CBSE).
const usesNcertBooks = (curriculum?: string) => isCbseCurriculum(curriculum || 'CBSE');
import LearnBlockEditor from './LearnBlockEditor';
import MathTutorEditor from './MathTutorEditor';
import type { SubtopicSectionPick } from '../services/curriculumLearningPathService';
import { LearningPathTopic, TeacherTopicContent, TeacherListenPart, TeacherPauseThink, TeacherPracticeQuestion } from '../types';

type Tab = 'learn' | 'audio' | 'practice';

// Renders exactly what the student will see for this topic once published —
// reuses LearningBlocks.tsx as-is (the same renderer the student Learn tab
// uses for this block schema) and bookSrc() (the same signed-URL builder
// BookPane.tsx uses) rather than duplicating either.
// A topic with no grounded content (content: null — the upload_text_only or
// needs_teacher_input case) has no blocks to show, so Learn falls back to a
// plain objectives/lessons view instead of an empty screen.
export default function StudentPreviewModal({
  topic,
  colors,
  onClose,
  onChangeContent,
  pathGrade,
  subject,
  curriculum,
  onRebuild,
}: {
  topic: LearningPathTopic;
  pathGrade?: string;
  subject?: string;
  curriculum?: string;
  onRebuild?: (picks: SubtopicSectionPick[]) => Promise<void>;
  colors: AppColors;
  onClose: () => void;
  // Wired to LearningPathEditor's updateContent → save, same PUT
  // learning-path path every other edit in this screen goes through.
  onChangeContent?: (content: TeacherTopicContent) => void;
}) {
  const [tab, setTab] = useState<Tab>('learn');
  // This panel is for editing, so Learn opens ready to edit; the toggle shows how it reads.
  const [editingLearn, setEditingLearn] = useState(!!onChangeContent);
  const hasBlocks = !!topic.content?.blocks?.length || !!topic.content?.whatYoullLearn?.length;
  const isMath = /math/i.test(topic.content?.contentType || topic.title || '');
  const audioLabel = isMath ? 'AI Tutor' : 'Listen';
  const bookPages = topic.content?.book?.pages || [];
  const inBook = bookPages.filter((p) => p.pdfFile).length;
  const sourceNote = topic.groundingSource === 'ncert_book'
    ? `From the NCERT book${bookPages.length ? ` · ${inBook} of ${bookPages.length} subtopics in the book${inBook < bookPages.length ? '; the rest taught by AI — please check' : ''}` : ''}`
    : topic.groundingSource === 'reference_sources'
      ? 'Written from reference material for your curriculum — please check it'
      : topic.groundingSource === 'model_knowledge' || topic.groundingSource === 'upload_text_only'
      ? 'Written by AI from your outline — please check it'
      : null;
  const listenParts = topic.content?.listenParts || [];
  const practiceQuiz = topic.content?.practiceQuiz || [];
  const editable = !!onChangeContent;

  function updateContent(updater: (content: TeacherTopicContent) => TeacherTopicContent) {
    if (!onChangeContent || !topic.content) return;
    onChangeContent(updater(topic.content));
  }

  function updateListenPart(pi: number, patch: Partial<TeacherListenPart>) {
    updateContent((content) => ({
      ...content,
      listenParts: (content.listenParts || []).map((p, i) => (i === pi ? { ...p, ...patch } : p)),
    }));
  }

  function updatePauseThinkField(pi: number, patch: Partial<TeacherPauseThink>) {
    updateContent((content) => ({
      ...content,
      listenParts: (content.listenParts || []).map((p, i) => (i === pi && p.pauseThink ? { ...p, pauseThink: { ...p.pauseThink, ...patch } } : p)),
    }));
  }

  function updatePauseThinkOption(pi: number, oi: number, value: string) {
    updateContent((content) => ({
      ...content,
      listenParts: (content.listenParts || []).map((p, i) => {
        if (i !== pi || !p.pauseThink) return p;
        return { ...p, pauseThink: { ...p.pauseThink, options: p.pauseThink.options.map((o, k) => (k === oi ? value : o)) } };
      }),
    }));
  }

  function updatePracticeQuestion(qi: number, patch: Partial<TeacherPracticeQuestion>) {
    updateContent((content) => ({
      ...content,
      practiceQuiz: (content.practiceQuiz || []).map((q, i) => (i === qi ? { ...q, ...patch } : q)),
    }));
  }

  function updatePracticeOption(qi: number, oi: number, value: string) {
    updateContent((content) => ({
      ...content,
      practiceQuiz: (content.practiceQuiz || []).map((q, i) => (i === qi ? { ...q, options: q.options.map((o, k) => (k === oi ? value : o)) } : q)),
    }));
  }

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
              <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted }}>Edit topic · Learn, Listen, Practice, book pages</Text>
            </View>
            <TouchableOpacity testID="close-student-preview" onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12 }}>
            {([['learn', 'Learn'], ['audio', audioLabel], ['practice', 'Practice']] as [Tab, string][]).map(([key, label]) => (
              <TouchableOpacity key={key} testID={`preview-tab-${key}`} onPress={() => setTab(key)} activeOpacity={0.7}>
                <Text style={{ fontSize: 13, fontWeight: '700', paddingBottom: 8, color: tab === key ? colors.primary : colors.textMuted, borderBottomWidth: tab === key ? 2 : 0, borderBottomColor: colors.primary }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView testID="student-preview-scroll" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
            {tab === 'learn' && (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1, gap: 10 }}>
                  {(!!sourceNote || (editable && hasBlocks)) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Text testID="preview-source-note" style={{ flex: 1, fontSize: 12, fontWeight: '600', color: topic.groundingSource === 'ncert_book' ? colors.primary : colors.textMuted }}>
                        {sourceNote}
                      </Text>
                      {editable && hasBlocks && (
                        <TouchableOpacity testID="toggle-edit-learn" onPress={() => setEditingLearn((v) => !v)} activeOpacity={0.7}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{editingLearn ? 'Preview' : 'Edit text'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  {editingLearn && editable && topic.content ? (
                    <LearnBlockEditor
                      blocks={topic.content.blocks || []}
                      colors={colors}
                      onChange={(blocks) => updateContent((content) => ({ ...content, blocks }))}
                    />
                  ) : hasBlocks ? (
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
                </View>
                <BookSidePane key={`${topic.title}-${topic.content?.book?.pdfFile}-${topic.content?.book?.pdfPage}`} topic={topic} pathGrade={pathGrade} subject={subject} colors={colors} onRebuild={usesNcertBooks(curriculum) ? onRebuild : undefined} />
              </View>
            )}

            {tab === 'audio' && topic.content?.mathTutor?.examples?.length ? (
              <MathTutorEditor
                tutor={topic.content.mathTutor}
                colors={colors}
                editable={editable}
                onChange={(mathTutor) => updateContent((content) => ({ ...content, mathTutor }))}
              />
            ) : tab === 'audio' && (
              listenParts.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>No {audioLabel.toLowerCase()} script yet for this topic.</Text>
              ) : listenParts.map((part, pi) => (
                <View key={pi} testID={`listen-part-${pi}`} style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 8 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: colors.textMain }}>{part.heading}</Text>
                  <TextInput
                    testID={`listen-part-text-${pi}`}
                    value={part.text}
                    onChangeText={(v) => updateListenPart(pi, { text: v })}
                    editable={editable}
                    multiline
                    style={{ fontSize: 13.5, lineHeight: 20, color: colors.textMain }}
                  />
                  {(!!part.keyIdea || editable) && (
                    <TextInput
                      testID={`listen-part-key-idea-${pi}`}
                      value={part.keyIdea || ''}
                      onChangeText={(v) => updateListenPart(pi, { keyIdea: v })}
                      placeholder="Key idea"
                      placeholderTextColor={colors.textMuted}
                      editable={editable}
                      style={{ fontSize: 12.5, fontStyle: 'italic', color: colors.textMuted }}
                    />
                  )}
                  {!!part.pauseThink && (
                    <View testID={`listen-part-pause-think-${pi}`} style={{ gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6C5CE7' }}>PAUSE & THINK</Text>
                      <TextInput
                        testID={`listen-part-pause-question-${pi}`}
                        value={part.pauseThink.question}
                        onChangeText={(v) => updatePauseThinkField(pi, { question: v })}
                        editable={editable}
                        style={{ fontSize: 13, color: colors.textMain }}
                      />
                      {part.pauseThink.options.map((opt, oi) => (
                        <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            testID={`listen-part-correct-${pi}-${oi}`}
                            disabled={!editable}
                            onPress={() => updatePauseThinkField(pi, { correctIndex: oi })}
                          >
                            <Feather name={oi === part.pauseThink!.correctIndex ? 'check-circle' : 'circle'} size={14} color={oi === part.pauseThink!.correctIndex ? colors.primary : colors.textMuted} />
                          </TouchableOpacity>
                          <TextInput
                            testID={`listen-part-option-${pi}-${oi}`}
                            value={opt}
                            onChangeText={(v) => updatePauseThinkOption(pi, oi, v)}
                            editable={editable}
                            style={{ flex: 1, fontSize: 13, color: colors.textMain }}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}

            {tab === 'practice' && (
              practiceQuiz.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>No practice questions yet for this topic.</Text>
              ) : practiceQuiz.map((q, qi) => (
                <View key={qi} testID={`practice-question-${qi}`} style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 10, padding: 12, gap: 8 }}>
                  <TextInput
                    testID={`practice-question-text-${qi}`}
                    value={q.question}
                    onChangeText={(v) => updatePracticeQuestion(qi, { question: v })}
                    editable={editable}
                    multiline
                    style={{ fontSize: 13.5, fontWeight: '700', color: colors.textMain }}
                  />
                  {q.type === 'mcq' ? q.options.map((opt, oi) => (
                    <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        testID={`practice-correct-${qi}-${oi}`}
                        disabled={!editable}
                        onPress={() => updatePracticeQuestion(qi, { correct: oi })}
                      >
                        <Feather name={oi === q.correct ? 'check-circle' : 'circle'} size={14} color={oi === q.correct ? colors.primary : colors.textMuted} />
                      </TouchableOpacity>
                      <TextInput
                        testID={`practice-option-${qi}-${oi}`}
                        value={opt}
                        onChangeText={(v) => updatePracticeOption(qi, oi, v)}
                        editable={editable}
                        style={{ flex: 1, fontSize: 13, color: colors.textMain }}
                      />
                    </View>
                  )) : (
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>ANSWER</Text>
                      <TextInput
                        testID={`practice-fillblank-answer-${qi}`}
                        value={String(q.correct)}
                        onChangeText={(v) => updatePracticeQuestion(qi, { correct: v })}
                        editable={editable}
                        style={{ fontSize: 13, color: colors.textMain }}
                      />
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
