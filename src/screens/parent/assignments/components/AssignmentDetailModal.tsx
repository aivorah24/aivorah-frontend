import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { getAnsweredQuizHtml } from '../../../../utils/answeredQuizHtml';
import type { Assignment } from '../hooks/useParentAssignments';

function formatDue(iso: string): { label: string; isOverdue: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(iso); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: 'Pending', isOverdue: false };
  if (diff === 0) return { label: 'Due today', isOverdue: false };
  if (diff === 1) return { label: 'Due tomorrow', isOverdue: false };
  return { label: `Due ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, isOverdue: false };
}

export default function AssignmentDetailModal({ assignment, colors, childName, onClose }: { assignment: Assignment; colors: AppColors; childName: string; onClose: () => void }) {
  const a = assignment;
  const isCompleted = a.status === 'completed';
  const due = isCompleted
    ? { label: a.score != null ? `Score: ${a.score}%` : 'Completed', isOverdue: false }
    : formatDue(a.dueDate);

  let feedback: any = {};
  let perQuestion: any[] = [];
  if (a.aiFeedback) {
    try {
      feedback = JSON.parse(a.aiFeedback);
      perQuestion = Array.isArray(feedback.perQuestion) ? feedback.perQuestion : [];
    } catch {
      feedback = { text: a.aiFeedback };
    }
  }
  // Interactive quizzes store answers in submission_text (surfaced as a.perQuestion
  // by the server), not ai_feedback — prefer that so the submitted worksheet shows.
  if ((a as any).perQuestion?.length) perQuestion = (a as any).perQuestion;

  const allQuestions: string[] = a.questions?.length ? a.questions : [];
  const taskSteps: any[] = a.taskSteps?.length ? a.taskSteps : [];
  const quizQuestions: any[] = a.quizQuestions?.length ? a.quizQuestions : [];
  const hasContent = allQuestions.length > 0 || taskSteps.length > 0 || quizQuestions.length > 0;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ backgroundColor: colors.cardDark, borderRadius: 18, maxHeight: '90%', width: '100%', maxWidth: 820, borderWidth: 1, borderColor: colors.borderColor }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentYellow + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="book-open" size={20} color={colors.accentYellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 16, fontWeight: '800', color: colors.textMain }} numberOfLines={2}>{a.title}</Text>
              <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {a.subject}{a.chapter ? ` · ${a.chapter}` : ''} · {childName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 24 }}>

            {/* Status + Due info */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center' }}>
                <Feather name={isCompleted ? 'check-circle' : 'clock'} size={18} color={isCompleted ? colors.accentGreen : colors.accentYellow} />
                <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: isCompleted ? colors.accentGreen : colors.accentYellow, marginTop: 4 }}>
                  {isCompleted ? 'Completed' : 'Pending'}
                </Text>
                <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textDim, marginTop: 1 }}>{due.label}</Text>
              </View>
              {isCompleted && a.score != null && (
                <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.accentYellow + '18', borderWidth: 1, borderColor: colors.accentYellow + '30', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: '900', color: colors.accentYellow, letterSpacing: -1 }}>{a.score}%</Text>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', color: colors.accentYellow, marginTop: 1 }}>Score</Text>
                </View>
              )}
              {isCompleted && (a as any).scoreHidden && (
                <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="lock" size={18} color={colors.textMuted} />
                  <Text style={{ fontFamily: fonts.serif, fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center', lineHeight: 15 }}>
                    Score hidden — the teacher has turned off progress sharing.
                  </Text>
                </View>
              )}
              {isCompleted && feedback.stamp && (
                <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="award" size={18} color={colors.accentYellow} />
                  <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.accentYellow, textAlign: 'center', marginTop: 4 }}>{feedback.stamp}</Text>
                </View>
              )}
            </View>

            {/* Note from parent/teacher */}
            {a.note ? (
              <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.accentYellow + '18', borderWidth: 1, borderColor: colors.accentYellow + '30' }}>
                <Feather name="message-circle" size={14} color={colors.accentYellow} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.accentYellow, textTransform: 'uppercase', letterSpacing: 0.5 }}>Note</Text>
                  <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.textMain, marginTop: 4, lineHeight: 20 }}>{a.note}</Text>
                </View>
              </View>
            ) : null}

            {/* Overall AI Feedback (completed only) */}
            {isCompleted && feedback.text ? (
              <View style={{ padding: 14, borderRadius: 12, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor, gap: 6 }}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>AI Feedback</Text>
                <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.textMain, lineHeight: 22 }}>{feedback.text}</Text>
              </View>
            ) : null}

            {/* Strengths & Improvement */}
            {isCompleted && (feedback.wellDone || feedback.improve) ? (
              <View style={{ gap: 10 }}>
                {feedback.wellDone ? (
                  <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accentGreen + '40', backgroundColor: colors.accentGreen + '08' }}>
                    <Feather name="check-circle" size={15} color={colors.accentGreen} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.accentGreen, textTransform: 'uppercase' }}>Strength</Text>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{feedback.wellDone}</Text>
                    </View>
                  </View>
                ) : null}
                {feedback.improve ? (
                  <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '08' }}>
                    <Feather name="target" size={15} color={colors.accentYellow} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.accentYellow, textTransform: 'uppercase' }}>Needs Improvement</Text>
                      <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{feedback.improve}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Submitted worksheet (interactive quizzes) — same answered view the
                 teacher/student see: the child's answers filled in and colour-marked. */}
            {isCompleted && (a as any).interactiveQuizHtml && perQuestion.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>Submitted Worksheet</Text>
                <View style={{ height: 500, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderColor, backgroundColor: '#0F0F0F' }}>
                  {Platform.OS === 'web' ? (
                    <View
                      style={{ flex: 1 } as any}
                      ref={(el: any) => {
                        if (el && !(el as any)._answered) {
                          (el as any)._answered = true;
                          const answered = getAnsweredQuizHtml((a as any).interactiveQuizHtml, { perQuestion });
                          const blob = new Blob([answered], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const f = document.createElement('iframe');
                          f.src = url;
                          f.style.cssText = 'width:100%;height:100%;border:none;display:block;';
                          f.title = 'Submitted Worksheet';
                          f.onload = () => URL.revokeObjectURL(url);
                          el.appendChild(f);
                        }
                      }}
                    />
                  ) : (
                    <WebView
                      source={{ html: getAnsweredQuizHtml((a as any).interactiveQuizHtml, { perQuestion }) }}
                      style={{ flex: 1, backgroundColor: '#0F0F0F' }}
                      originWhitelist={['*']}
                      javaScriptEnabled
                      domStorageEnabled
                    />
                  )}
                </View>
              </View>
            ) : null}

            {/* Questions Section */}
            {hasContent && (
              <View style={{ gap: 6 }}>
                <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {isCompleted ? 'Questions & Answers' : 'Questions'}
                </Text>

                {/* Regular questions */}
                {allQuestions.map((q, idx) => {
                  const pq = perQuestion.find((p: any) => (p.number ?? p.index) === idx + 1) || perQuestion[idx];
                  const qColor = !pq ? colors.textDim
                    : !pq.answered ? colors.textDim
                    : pq.correct ? colors.accentGreen
                    : (pq.score ?? 0) >= 50 ? colors.accentYellow
                    : colors.accentRed;
                  const qIcon = !pq ? 'circle'
                    : !pq.answered ? 'minus-circle'
                    : pq.correct ? 'check-circle'
                    : (pq.score ?? 0) >= 50 ? 'alert-circle'
                    : 'x-circle';

                  return (
                    <View key={idx} style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: (isCompleted && pq) ? qColor + '40' : colors.borderColor, backgroundColor: (isCompleted && pq) ? qColor + '06' : colors.bgDark, gap: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isCompleted && pq ? qColor + '20' : colors.accentYellow + '18', alignItems: 'center', justifyContent: 'center' }}>
                          {isCompleted && pq ? (
                            <Feather name={qIcon as any} size={12} color={qColor} />
                          ) : (
                            <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '800', color: colors.accentYellow }}>{idx + 1}</Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', color: colors.textMain, lineHeight: 18 }}>{q}</Text>
                          {isCompleted && pq && (
                            <View style={{ marginTop: 5, gap: 3 }}>
                              {pq.studentAnswer && (
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textDim }}>Answer:</Text>
                                  <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMain, flex: 1 }}>{pq.studentAnswer}</Text>
                                </View>
                              )}
                              {pq.correctAnswer && !pq.correct && (
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.accentGreen }}>Correct:</Text>
                                  <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.accentGreen, flex: 1 }}>{pq.correctAnswer}</Text>
                                </View>
                              )}
                              {pq.comment && (
                                <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted, lineHeight: 18, fontStyle: 'italic' }}>{pq.comment}</Text>
                              )}
                              {pq.explanation && (
                                <View style={{ padding: 10, borderRadius: 8, backgroundColor: colors.accentYellow + '18', marginTop: 2 }}>
                                  <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.accentYellow, marginBottom: 2 }}>Explanation</Text>
                                  <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{pq.explanation}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                        {isCompleted && pq && pq.score != null && (
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: qColor + '20' }}>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '800', color: qColor }}>{pq.answered ? `${pq.score}%` : '--'}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Quiz questions (MCQ) */}
                {quizQuestions.map((qq: any, idx: number) => {
                  const pq = perQuestion.find((p: any) => (p.number ?? p.index) === idx + 1) || perQuestion[idx];
                  const qColor = !pq ? colors.textDim
                    : pq.correct ? colors.accentGreen
                    : colors.accentRed;

                  return (
                    <View key={`quiz-${idx}`} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: (isCompleted && pq) ? qColor + '40' : colors.borderColor, backgroundColor: (isCompleted && pq) ? qColor + '06' : colors.bgDark, gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: isCompleted && pq ? qColor + '20' : colors.accentYellow + '18', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '800', color: isCompleted && pq ? qColor : colors.accentYellow }}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: colors.textMain, lineHeight: 20 }}>{qq.question}</Text>
                          {Array.isArray(qq.options) && (
                            <View style={{ marginTop: 8, gap: 4 }}>
                              {qq.options.map((opt: string, oi: number) => {
                                const isCorrectOpt = opt === qq.correctAnswer || opt === qq.answer;
                                const isStudentOpt = isCompleted && pq && opt === pq.studentAnswer;
                                return (
                                  <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: isStudentOpt ? (isCorrectOpt ? colors.accentGreen + '12' : colors.accentRed + '12') : isCompleted && isCorrectOpt ? colors.accentGreen + '08' : 'transparent' }}>
                                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: isStudentOpt ? (isCorrectOpt ? colors.accentGreen : colors.accentRed) : colors.borderColor, alignItems: 'center', justifyContent: 'center', backgroundColor: isStudentOpt ? (isCorrectOpt ? colors.accentGreen : colors.accentRed) : 'transparent' }}>
                                      {isStudentOpt && <Feather name={isCorrectOpt ? 'check' : 'x'} size={10} color="#fff" />}
                                    </View>
                                    <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: isStudentOpt ? (isCorrectOpt ? colors.accentGreen : colors.accentRed) : colors.textMain, fontWeight: isStudentOpt || (isCompleted && isCorrectOpt) ? '600' : '400' }}>{opt}</Text>
                                    {isCompleted && isCorrectOpt && !isStudentOpt && (
                                      <Feather name="check" size={12} color={colors.accentGreen} />
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                          {isCompleted && pq?.comment && (
                            <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted, lineHeight: 18, fontStyle: 'italic', marginTop: 6 }}>{pq.comment}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Scaffolded task steps */}
                {taskSteps.map((step: any, idx: number) => (
                  <View key={`step-${idx}`} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgDark, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentYellow + '18', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '800', color: colors.accentYellow }}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', color: colors.textMain }}>{step.label || step.title || `Step ${idx + 1}`}</Text>
                        {step.type && (
                          <Text style={{ fontFamily: fonts.serif, fontSize: 10, fontWeight: '600', color: colors.accentYellow, textTransform: 'uppercase', marginTop: 2 }}>{step.type.replace(/_/g, ' ')}</Text>
                        )}
                      </View>
                    </View>
                    {(step.instructions || step.instruction) && (
                      <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.textMain, lineHeight: 20, marginLeft: 36 }}>{step.instructions || step.instruction}</Text>
                    )}
                    {step.provocation && (
                      <View style={{ marginLeft: 36, padding: 10, borderRadius: 8, backgroundColor: colors.accentYellow + '18', borderWidth: 1, borderColor: colors.accentYellow + '30' }}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.accentYellow, marginBottom: 2 }}>Provocation</Text>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{step.provocation}</Text>
                      </View>
                    )}
                    {Array.isArray(step.problems) && step.problems.length > 0 && (
                      <View style={{ marginLeft: 36, gap: 6 }}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase' }}>Problems</Text>
                        {step.problems.map((p: string, pi: number) => (
                          <View key={pi} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', color: colors.accentYellow }}>{pi + 1}.</Text>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: colors.textMain, flex: 1, lineHeight: 20 }}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {Array.isArray(step.sections) && step.sections.length > 0 && (
                      <View style={{ marginLeft: 36, gap: 4 }}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase' }}>Sections</Text>
                        {step.sections.map((s: string, si: number) => (
                          <View key={si} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accentYellow }} />
                            <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted }}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {Array.isArray(step.reflectionPrompts) && step.reflectionPrompts.length > 0 && (
                      <View style={{ marginLeft: 36, gap: 6 }}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase' }}>Reflection Prompts</Text>
                        {step.reflectionPrompts.map((r: string, ri: number) => (
                          <Text key={ri} style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>{ri + 1}. {r}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* No content fallback — hidden when the submitted worksheet is shown. */}
            {!hasContent && !(isCompleted && (a as any).interactiveQuizHtml && perQuestion.length > 0) && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Feather name="file-text" size={32} color={colors.textDim} />
                <Text style={{ fontFamily: fonts.serif, fontSize: 14, color: colors.textDim, marginTop: 8 }}>
                  {isCompleted ? 'No detailed questions recorded' : 'No questions added yet'}
                </Text>
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
