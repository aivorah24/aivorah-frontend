import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { StudentItem, TaskStep } from '../types';
import { STEP_COLORS, STEP_ICONS } from '../constants';

// The final "review before publishing" screen — extracted verbatim (no
// behavior change) from TeacherAssignmentsScreen.tsx, eighteenth step of its
// hooks/components decomposition (2026-08-25).
export function PreviewModal({
  visible, onClose, title, subject, grade, curriculum, dueDate, type, assignTo, selectedStudent,
  chapter, note, quizQuestions, setQuizQuestions, taskSteps, questions, extractedQuestions, docFiles,
  formError, creating, onPublish, colors, gold, styles,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subject: string;
  grade: string;
  curriculum: string;
  dueDate: string;
  type: 'assignment' | 'quiz';
  assignTo: 'all' | 'specific';
  selectedStudent: StudentItem | null;
  chapter: string;
  note: string;
  quizQuestions: any[];
  setQuizQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  taskSteps: TaskStep[];
  questions: string[];
  extractedQuestions: { question: string; answer: string; comment: string }[];
  docFiles: { name: string; base64: string; mime: string }[];
  formError: string;
  creating: boolean;
  onPublish: () => void;
  colors: AppColors;
  gold: string;
  styles: any;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: colors.cardDark, borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '92%', borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' }}>
          {/* Preview Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="eye" size={18} color={colors.accentGreen} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accentGreen }}>Preview</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.75}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 30 }}>
            {/* Basic info card */}
            <View style={{ padding: 14, borderRadius: 14, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain }}>{title}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {subject} · {grade} · {curriculum} · Due: {dueDate}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: type === 'quiz' ? gold + '20' : colors.accentYellow + '20' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: type === 'quiz' ? gold : colors.accentYellow }}>
                    {type === 'quiz' ? 'QUIZ' : 'ASSIGNMENT'}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.borderColor }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>
                    {assignTo === 'all' ? 'All Students' : selectedStudent?.name || 'Specific Student'}
                  </Text>
                </View>
              </View>
              {chapter.trim() ? (
                <Text style={{ fontSize: 12, color: colors.textDim }}>Chapter: {chapter}</Text>
              ) : null}
            </View>

            {note.trim() ? (
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor }}>
                <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '600', marginBottom: 4 }}>Note for students:</Text>
                <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 20 }}>{note}</Text>
              </View>
            ) : null}

            {/* Quiz questions preview — editable */}
            {type === 'quiz' && quizQuestions.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.accentGreen }}>
                  Quiz Questions ({quizQuestions.length})
                </Text>
                {quizQuestions.map((q, i) => (
                  <View key={q.id || i} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: gold, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{i + 1}</Text>
                      </View>
                      <TextInput
                        style={[styles.input, { flex: 1, fontSize: 13, marginBottom: 0 }]}
                        value={q.question}
                        onChangeText={(t) => setQuizQuestions(prev => prev.map((qq, j) => j === i ? { ...qq, question: t } : qq))}
                        multiline
                      />
                      <TouchableOpacity onPress={() => setQuizQuestions(prev => prev.filter((_, j) => j !== i))}>
                        <Feather name="trash-2" size={14} color={colors.accentRed} />
                      </TouchableOpacity>
                    </View>
                    {q.type === 'fill_blank' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 32 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentGreen }}>Answer:</Text>
                        <TextInput
                          style={[styles.input, { flex: 1, fontSize: 12, paddingVertical: 5, marginBottom: 0, borderColor: colors.accentGreen + '60' }]}
                          value={q.correct}
                          onChangeText={(t) => setQuizQuestions(prev => prev.map((qq, j) => j === i ? { ...qq, correct: t } : qq))}
                          placeholder="Correct answer..."
                        />
                        <Feather name="check-circle" size={14} color={colors.accentGreen} />
                      </View>
                    ) : q.options?.map((opt: string, oi: number) => (
                      <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 32 }}>
                        <TouchableOpacity
                          onPress={() => setQuizQuestions(prev => prev.map((qq, j) => j === i ? { ...qq, correct: opt } : qq))}
                          style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
                            borderColor: opt === q.correct ? colors.accentGreen : colors.borderColor,
                            backgroundColor: opt === q.correct ? colors.accentGreen + '20' : 'transparent',
                            alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: opt === q.correct ? colors.accentGreen : colors.textDim }}>
                            {String.fromCharCode(65 + oi)}
                          </Text>
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.input, { flex: 1, fontSize: 12, paddingVertical: 5, marginBottom: 0 }]}
                          value={opt}
                          onChangeText={(t) => setQuizQuestions(prev => prev.map((qq, j) => {
                            if (j !== i) return qq;
                            const newOpts = [...(qq.options || [])];
                            const wasCorrect = newOpts[oi] === qq.correct;
                            newOpts[oi] = t;
                            return { ...qq, options: newOpts, correct: wasCorrect ? t : qq.correct };
                          }))}
                        />
                        {opt === q.correct && <Feather name="check-circle" size={14} color={colors.accentGreen} />}
                      </View>
                    ))}
                    {q.hint && (
                      <View style={{ flexDirection: 'row', gap: 4, paddingLeft: 32 }}>
                        <Feather name="info" size={10} color={colors.accentYellow} style={{ marginTop: 2 }} />
                        <Text style={{ fontSize: 10, color: colors.accentYellow, flex: 1 }}>Hint: {q.hint}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Task steps preview (AI assignment) */}
            {type === 'assignment' && taskSteps.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#BAA467' }}>
                  Task Steps ({taskSteps.length})
                </Text>
                {taskSteps.map((step, idx) => (
                  <View key={step.id} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: STEP_COLORS[step.type] + '40', gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: STEP_COLORS[step.type] + '30', alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name={STEP_ICONS[step.type] as any} size={12} color={STEP_COLORS[step.type]} />
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>{step.label}</Text>
                    </View>
                    {step.provocation ? <Text style={{ fontSize: 11, color: colors.textMain, paddingLeft: 32, lineHeight: 16, fontStyle: 'italic' }}>{step.provocation}</Text> : null}
                    <Text style={{ fontSize: 11, color: colors.textDim, paddingLeft: 32 }}>{step.instructions}</Text>
                    {step.sections.length > 0 && (
                      <View style={{ paddingLeft: 32, gap: 2, marginTop: 2 }}>
                        {step.sections.map((s, si) => (
                          <Text key={si} style={{ fontSize: 10, color: colors.textMuted }}>- {s}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Worksheet questions preview */}
            {type === 'assignment' && taskSteps.length === 0 && questions.filter(q => q.trim()).length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMuted }}>
                  Questions ({questions.filter(q => q.trim()).length})
                </Text>
                {questions.filter(q => q.trim()).map((q, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim }}>{i + 1}.</Text>
                    <Text style={{ fontSize: 13, color: colors.textMain, flex: 1, lineHeight: 20 }}>{q}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Extracted questions with answers (hidden — backup feature) */}
            {false && extractedQuestions.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.accentCyan }}>
                  Extracted Questions ({extractedQuestions.length})
                </Text>
                {extractedQuestions.map((eq, idx) => (
                  <View key={idx} style={{ padding: 10, borderRadius: 10, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, gap: 6 }}>
                    <Text style={{ fontSize: 13, color: colors.textMain, fontWeight: '600' }}>Q{idx + 1}. {eq.question}</Text>
                    {eq.answer.trim() ? (
                      <Text style={{ fontSize: 11, color: colors.accentGreen }}>Answer: {eq.answer}</Text>
                    ) : null}
                    {eq.comment.trim() ? (
                      <Text style={{ fontSize: 11, color: colors.accentYellow, fontStyle: 'italic' }}>Comment: {eq.comment}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {docFiles.length > 0 && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="image" size={14} color={gold} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: gold }}>
                    Worksheet Pages ({docFiles.length})
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4 }}>
                    {docFiles.map((f, idx) => (
                      <View key={idx} style={{ width: 160, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderColor }}>
                        {f.mime.startsWith('image/') ? (
                          <Image source={{ uri: `data:${f.mime};base64,${f.base64}` }} style={{ width: 160, height: 220 }} resizeMode="contain" />
                        ) : (
                          <View style={{ width: 160, height: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgDark }}>
                            <Feather name="file-text" size={32} color={gold} />
                          </View>
                        )}
                        <View style={{ padding: 6, backgroundColor: colors.bgDark }}>
                          <Text style={{ fontSize: 10, color: colors.textDim, textAlign: 'center' }}>Page {idx + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Bottom action bar */}
          <View style={{ gap: 8, padding: 18, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
            {formError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: colors.accentRed + '15', borderWidth: 1, borderColor: colors.accentRed + '30' }}>
                <Feather name="alert-circle" size={14} color={colors.accentRed} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.accentRed, fontWeight: '600' }}>{formError}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderColor }}
              onPress={onClose}
              activeOpacity={0.75}
            >
              <Feather name="edit-2" size={14} color={colors.textMuted} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}>Back to Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { flex: 2 }]}
              onPress={onPublish}
              activeOpacity={0.85}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#fff" />
                  <Text style={styles.submitBtnText}>Publish Assignment</Text>
                </>
              )}
            </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
