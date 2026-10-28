import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import type { Assignment } from '../types';
import { SUBJECT_COLORS } from '../constants';
import { daysUntil, formatDate } from '../utils/helpers';
import { getAnsweredQuizHtml } from '../utils/quizHtml';
import { normalizeCurriculum } from '../../../../utils/curriculum';

// The assignment Detail modal (Overview / Students / Questions tabs) —
// extracted verbatim (no behavior change) from TeacherAssignmentsScreen.tsx,
// thirteenth step of its hooks/components decomposition (2026-08-25).
export function AssignmentDetailModal({
  assignment, detailTab, setDetailTab, detailSubmissions, detailTotalLinked, loadingSubmissions,
  expandedStudent, setExpandedStudent, teacherFeedback, setTeacherFeedback, sendingFeedback, sendFeedback,
  editingFeedbackFor = null, setEditingFeedbackFor = () => {},
  markComplete, deleteAssignment, onClose, onImagePress, onPreviewHtml,
  colors, gold, styles,
}: {
  assignment: Assignment;
  detailTab: 'overview' | 'students' | 'questions';
  setDetailTab: (t: 'overview' | 'students' | 'questions') => void;
  detailSubmissions: any[];
  detailTotalLinked: number;
  loadingSubmissions: boolean;
  expandedStudent: string | null;
  setExpandedStudent: (id: string | null) => void;
  teacherFeedback: string;
  setTeacherFeedback: (v: string) => void;
  sendingFeedback: boolean;
  sendFeedback: (assignmentId: string, studentId: string) => void;
  editingFeedbackFor?: string | null;
  setEditingFeedbackFor?: (id: string | null) => void;
  markComplete: (id: string) => void;
  deleteAssignment: (id: string) => void;
  onClose: () => void;
  onImagePress: (uri: string) => void;
  onPreviewHtml: (html: string) => void;
  colors: AppColors;
  gold: string;
  styles: any;
}) {
  const a = assignment;
  const sc = SUBJECT_COLORS[a.subject] || gold;
  const due = daysUntil(a.dueDate);
  const completedCount = detailSubmissions.filter(s => s.status === 'completed').length;
  const totalCount = detailTotalLinked || detailSubmissions.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allQs: any[] = (a as any).quizQuestions?.length > 0
    ? (a as any).quizQuestions
    : (a.questions?.length ?? 0) > 0
      ? (a.questions as any[])
      : (a.taskSteps?.length ?? 0) > 0
        ? (a.taskSteps as any[])
        : [];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalBox, { maxHeight: '90%' }]}>
          {/* Colour bar */}
          <View style={{ height: 5, backgroundColor: sc, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }} />

          {/* Fixed header */}
          <View style={{ padding: spacing.lg, paddingBottom: 0, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 5 }}>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <View style={[styles.typePill, { backgroundColor: sc + '20', borderColor: sc + '50' }]}>
                    <Text style={[styles.typeText, { color: sc }]}>{a.type?.toUpperCase()}</Text>
                  </View>
                  {a.grade && <View style={styles.broadcastPill}><Text style={styles.broadcastText}>{a.grade}</Text></View>}
                  {a.curriculum && <View style={styles.broadcastPill}><Text style={styles.broadcastText}>{normalizeCurriculum(a.curriculum)}</Text></View>}
                  {a.studentId === null && (
                    <View style={styles.broadcastPill}>
                      <Feather name="users" size={9} color={gold} />
                      <Text style={styles.broadcastText}>All students</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textMain }}>{a.title}</Text>
                {a.chapter ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{a.chapter}</Text> : null}
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 10 }}>
              {(['overview', 'students', 'questions'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setDetailTab(tab)}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: detailTab === tab ? sc : colors.borderColor, backgroundColor: detailTab === tab ? sc + '18' : 'transparent' }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: detailTab === tab ? sc : colors.textMuted, textTransform: 'capitalize' }}>
                    {tab === 'students' ? `Students${totalCount > 0 ? ` (${completedCount}/${totalCount})` : ''}` : tab === 'questions' ? `Questions${allQs.length > 0 ? ` (${allQs.length})` : ''}` : 'Overview'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingTop: 4, gap: spacing.md }}>

            {/* ── OVERVIEW TAB ── */}
            {detailTab === 'overview' && (
              <>
                {/* Meta grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { icon: 'book-open', label: 'Subject', value: a.subject },
                    { icon: 'calendar', label: 'Due Date', value: formatDate(a.dueDate) },
                    { icon: 'clock', label: 'Status', value: due.label },
                    { icon: 'check-circle', label: 'Completion', value: `${completedCount}/${totalCount > 0 ? totalCount : '?'} students` },
                  ].map(item => (
                    <View key={item.label} style={{ width: '47%', backgroundColor: colors.cardDark, borderRadius: radius.md, padding: 12, gap: 4, borderWidth: 1, borderColor: colors.borderColor }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Feather name={item.icon as any} size={11} color={sc} />
                        <Text style={{ fontSize: 10, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textMain, fontWeight: '600' }}>{item.value}</Text>
                    </View>
                  ))}
                </View>

                {/* Purpose / note */}
                {a.note ? (
                  <View style={{ backgroundColor: sc + '10', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: sc + '25', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="target" size={12} color={sc} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: sc, textTransform: 'uppercase', letterSpacing: 0.8 }}>Purpose</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 20 }}>{a.note}</Text>
                  </View>
                ) : null}

                {/* Showcase Interactive Quiz (generated from worksheet) instead of scanned worksheet preview */}
                {(a as any).interactiveQuizHtml ? (
                  <View style={{ gap: 8, backgroundColor: sc + '08', borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: sc + '30' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="eye" size={14} color={sc} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: sc, textTransform: 'uppercase', letterSpacing: 0.8 }}>Interactive Quiz Preview</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                      This assignment uses an interactive quiz generated from the uploaded worksheet.
                    </Text>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: sc, borderRadius: radius.md, paddingVertical: 10, marginTop: 4 }}
                      onPress={() => onPreviewHtml((a as any).interactiveQuizHtml)}
                      activeOpacity={0.85}
                    >
                      <Feather name="play" size={12} color="#fff" style={{ marginLeft: 2 }} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Open Interactive Preview</Text>
                    </TouchableOpacity>
                  </View>
                ) : (a.documentUrls?.length ?? 0) > 0 ? (
                  /* Original scanned worksheet pages fallback */
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Worksheet Pages ({a.documentUrls!.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {a.documentUrls!.map((url: string, idx: number) => (
                          <TouchableOpacity key={idx} activeOpacity={0.8} onPress={() => onImagePress(url)}>
                            <View style={{ width: 140, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: sc + '40' }}>
                              <Image source={{ uri: url }} style={{ width: 140, height: 190 }} resizeMode="contain" />
                              <View style={{ paddingVertical: 3, backgroundColor: sc + '15', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: sc }}>Page {idx + 1}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : null}

                {/* Success criteria */}
                {(a.successCriteria?.length ?? 0) > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Success Criteria</Text>
                    {a.successCriteria!.map((c: string, ci: number) => (
                      <View key={ci} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                        <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 1.5, borderColor: sc + '60', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                          <Feather name="check" size={9} color={sc} />
                        </View>
                        <Text style={{ fontSize: 12, color: colors.textMuted, flex: 1, lineHeight: 17 }}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  {a.status !== 'completed' && (
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { flex: 1, backgroundColor: sc }]}
                      onPress={() => { markComplete(a.id); onClose(); }}
                      activeOpacity={0.8}
                    >
                      <Feather name="check" size={14} color="#fff" />
                      <Text style={styles.modalSaveBtnText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { flex: 1 }]}
                    onPress={() => { deleteAssignment(a.id); onClose(); }}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={14} color={colors.accentRed} />
                    <Text style={[styles.modalCancelBtnText, { color: colors.accentRed }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── STUDENTS TAB ── */}
            {detailTab === 'students' && (
              <>
                {/* Completion progress bar */}
                {totalCount > 0 && (
                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>Completion Progress</Text>
                      <Text style={{ fontSize: 12, color: sc, fontWeight: '800' }}>{completedCount}/{totalCount} ({completionPct}%)</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.borderColor, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${completionPct}%` as any, backgroundColor: sc, borderRadius: 4 }} />
                    </View>
                  </View>
                )}

                {loadingSubmissions ? (
                  <ActivityIndicator color={sc} style={{ marginTop: 24 }} />
                ) : detailSubmissions.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                    <Feather name="users" size={32} color={colors.textDim} />
                    <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>No submissions yet.</Text>
                    <Text style={{ fontSize: 12, color: colors.textDim, textAlign: 'center' }}>Students haven&apos;t started this assignment.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    {detailSubmissions.map((sub: any, i: number) => {
                      const done = sub.status === 'completed';
                      const isExpanded = expandedStudent === sub.studentId;
                      const pq: any[] = sub.perQuestion || [];
                      let fbObj: any = {};
                      try { fbObj = JSON.parse(sub.aiFeedback || '{}'); } catch { fbObj = { text: sub.aiFeedback || '' }; }
                      const existingTeacherFb = fbObj.teacherFeedback || '';
                      // Unchanged text can't be re-sent (it would re-notify for nothing).
                      const canSendFb = !!teacherFeedback.trim() && teacherFeedback.trim() !== existingTeacherFb;
                      return (
                        <View key={sub.studentId || i} style={{ backgroundColor: colors.cardDark, borderRadius: radius.md, borderWidth: 1, borderColor: isExpanded ? sc + '60' : (done ? sc + '40' : colors.borderColor), overflow: 'hidden' }}>
                          {/* Student header — tappable */}
                          <TouchableOpacity activeOpacity={0.7} onPress={() => { setExpandedStudent(isExpanded ? null : sub.studentId); setTeacherFeedback(existingTeacherFb); setEditingFeedbackFor(null); }} style={{ padding: 14, gap: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: sc + '25', alignItems: 'center', justifyContent: 'center' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: sc }}>{(sub.studentName || '?')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }}>{sub.studentName || 'Unknown'}</Text>
                                  {sub.grade ? <Text style={{ fontSize: 11, color: colors.textDim }}>{sub.grade}</Text> : null}
                                </View>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                                  {sub.score != null && (
                                    <View style={{ backgroundColor: sc + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '800', color: sc }}>{sub.score}%</Text>
                                    </View>
                                  )}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Feather name={done ? 'check-circle' : 'clock'} size={11} color={done ? colors.accentGreen : colors.accentYellow} />
                                    <Text style={{ fontSize: 11, color: done ? colors.accentGreen : colors.accentYellow, fontWeight: '600' }}>{done ? 'Completed' : 'Pending'}</Text>
                                  </View>
                                </View>
                                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
                              </View>
                            </View>
                            {sub.completedAt ? (
                              <View style={{ marginLeft: 40, marginTop: 4, gap: 4 }}>
                                <Text style={{ fontSize: 11, color: colors.textDim }}>Submitted {formatDate(sub.completedAt)}</Text>
                                {pq.length > 0 ? (
                                  <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Feather name="clock" size={11} color={colors.textDim} />
                                      <Text style={{ fontSize: 11, color: colors.textDim }}>
                                        {(() => {
                                          const totalTime = pq.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);
                                          return totalTime >= 60 ? `${Math.floor(totalTime / 60)}m ${totalTime % 60}s` : `${totalTime}s`;
                                        })()}
                                      </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Feather name="zap" size={11} color={colors.accentYellow} />
                                      <Text style={{ fontSize: 11, color: colors.textDim }}>
                                        1st Go: {pq.filter(x => x.firstGo).length}/{pq.length}
                                      </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Feather name="refresh-cw" size={11} color={colors.textDim} />
                                      <Text style={{ fontSize: 11, color: colors.textDim }}>
                                        Avg Att: {(pq.reduce((acc, curr) => acc + (curr.attempts || 1), 0) / pq.length).toFixed(1)}
                                      </Text>
                                    </View>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                          </TouchableOpacity>

                          {/* Expanded: per-question answers + feedback */}
                          {isExpanded && (
                            <View style={{ borderTopWidth: 1, borderTopColor: colors.borderColor, padding: 14, gap: 12 }}>
                              {/* Per-question breakdown */}
                              {pq.length > 0 ? (
                                <View style={{ gap: 10 }}>
                                  <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Question-by-Question</Text>
                                  {pq.map((q: any, qi: number) => {
                                    // Interactive-quiz submissions (server/routes/quiz.js) store `answer` +
                                    // `correct` (boolean); AI-graded task submissions store `score` (0-100)
                                    // + `studentAnswer` directly. Support both shapes — this screen was only
                                    // reading the second shape, so quiz-type submissions always showed a
                                    // blank answer and a hardcoded 0%.
                                    const qScore = q.score ?? (q.correct === true ? 100 : q.correct === false ? 0 : 0);
                                    const studentAnswerText = q.studentAnswer ?? q.answer ?? '';
                                    const scoreColor = qScore >= 70 ? colors.accentGreen : qScore >= 40 ? colors.accentYellow : colors.accentRed;
                                    return (
                                      <View key={qi} style={{ backgroundColor: colors.bgDark, borderRadius: 10, padding: 12, gap: 6, borderLeftWidth: 3, borderLeftColor: scoreColor }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <Text style={{ fontSize: 12, color: colors.textMain, fontWeight: '700', flex: 1 }}>Q{q.number || qi + 1}. {q.question || q.stepLabel || ''}</Text>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                                            {q.timeSpent > 0 ? (
                                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                                <Feather name="clock" size={10} color={colors.textDim} />
                                                <Text style={{ fontSize: 10, color: colors.textDim, fontWeight: '600' }}>
                                                  {q.timeSpent >= 60 ? `${Math.floor(q.timeSpent / 60)}m ${q.timeSpent % 60}s` : `${q.timeSpent}s`}
                                                </Text>
                                              </View>
                                            ) : null}
                                            <View style={{ backgroundColor: scoreColor + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                              <Text style={{ fontSize: 11, fontWeight: '800', color: scoreColor }}>{qScore}%</Text>
                                            </View>
                                          </View>
                                        </View>
                                        {/* Interactive-quiz assignments have a proper "View Student's Answered
                                            Sheet" button below (the real rendered worksheet, including Venn
                                            diagrams etc.) — this raw text dump was the only option before that
                                            existed and is redundant (and unreadable for Venn answers) once it
                                            does. Still needed for other assignment types, which have no such
                                            button. */}
                                        {studentAnswerText && !(a as any).interactiveQuizHtml ? (
                                          <View style={{ gap: 2 }}>
                                            <Text style={{ fontSize: 10, color: colors.textDim, fontWeight: '600' }}>What the student did:</Text>
                                            <Text style={{ fontSize: 12, color: colors.textMain, lineHeight: 18, backgroundColor: colors.cardDark, borderRadius: 6, padding: 8 }}>{studentAnswerText}</Text>
                                          </View>
                                        ) : null}
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Feather name="refresh-cw" size={10} color={colors.textDim} />
                                            <Text style={{ fontSize: 10, color: colors.textDim, fontWeight: '600' }}>Attempts: {q.attempts || 1}</Text>
                                          </View>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Feather name={q.firstGo ? 'zap' : 'alert-circle'} size={10} color={q.firstGo ? colors.accentYellow : colors.textDim} />
                                            <Text style={{ fontSize: 10, color: q.firstGo ? colors.accentYellow : colors.textDim, fontWeight: '600' }}>
                                              {q.firstGo ? 'Answered on 1st go' : 'Needed multiple attempts'}
                                            </Text>
                                          </View>
                                        </View>
                                        {(q.teacherNote || q.comment) ? (
                                          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                            <Feather name="clipboard" size={11} color={colors.accentCyan} style={{ marginTop: 2 }} />
                                            <Text style={{ fontSize: 11, color: colors.accentCyan, flex: 1, lineHeight: 16 }}>
                                              <Text style={{ fontWeight: '700' }}>AI assessment: </Text>{q.teacherNote || q.comment}
                                            </Text>
                                          </View>
                                        ) : null}
                                      </View>
                                    );
                                  })}
                                  {done && (a as any).interactiveQuizHtml ? (
                                    <TouchableOpacity
                                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accentCyan + '15', borderRadius: radius.md, paddingVertical: 10, borderWidth: 1, borderColor: colors.accentCyan + '40', marginTop: 8 }}
                                      onPress={() => {
                                        const answeredHtml = getAnsweredQuizHtml((a as any).interactiveQuizHtml, sub);
                                        onPreviewHtml(answeredHtml);
                                      }}
                                      activeOpacity={0.8}
                                    >
                                      <Feather name="eye" size={14} color={colors.accentCyan} />
                                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentCyan }}>View Student&apos;s Answered Sheet</Text>
                                    </TouchableOpacity>
                                  ) : null}
                                </View>
                              ) : done ? (
                                <View style={{ alignItems: 'center', paddingVertical: 12, gap: 4 }}>
                                  <Feather name="file-text" size={20} color={colors.textDim} />
                                  <Text style={{ fontSize: 12, color: colors.textDim }}>Submission recorded (no per-question data)</Text>
                                </View>
                              ) : null}

                              {/* AI Feedback summary — teacher tone */}
                              {(fbObj.teacherSummary || fbObj.text || fbObj.wellDone || fbObj.improve) ? (
                                <View style={{ backgroundColor: sc + '0E', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: sc + '60', gap: 6 }}>
                                  <Text style={{ fontSize: 10, color: sc, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>AI Assessment</Text>
                                  {(fbObj.teacherSummary || fbObj.text) ? <Text style={{ fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{fbObj.teacherSummary || fbObj.text}</Text> : null}
                                  {fbObj.wellDone ? (
                                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                      <Feather name="thumbs-up" size={11} color={colors.accentGreen} style={{ marginTop: 2 }} />
                                      <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1, lineHeight: 16 }}><Text style={{ fontWeight: '700', color: colors.accentGreen }}>Strength: </Text>{fbObj.wellDone}</Text>
                                    </View>
                                  ) : null}
                                  {fbObj.improve ? (
                                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                                      <Feather name="trending-up" size={11} color={colors.accentYellow} style={{ marginTop: 2 }} />
                                      <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1, lineHeight: 16 }}><Text style={{ fontWeight: '700', color: colors.accentYellow }}>Next step: </Text>{fbObj.improve}</Text>
                                    </View>
                                  ) : null}
                                </View>
                              ) : null}

                              {/* Existing teacher feedback */}
                              {existingTeacherFb && editingFeedbackFor !== sub.studentId ? (
                                <View style={{ backgroundColor: colors.accentCyan + '0E', borderRadius: 8, padding: 10, borderLeftWidth: 3, borderLeftColor: colors.accentCyan + '60', gap: 4 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Feather name="user" size={11} color={colors.accentCyan} />
                                    <Text style={{ flex: 1, fontSize: 10, color: colors.accentCyan, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Teacher Feedback</Text>
                                    {done && (
                                      <TouchableOpacity
                                        testID={`editFeedback-${sub.studentId}`}
                                        onPress={() => { setTeacherFeedback(existingTeacherFb); setEditingFeedbackFor(sub.studentId); }}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                                        accessibilityLabel="Edit feedback"
                                      >
                                        <Feather name="edit-2" size={12} color={colors.accentCyan} />
                                        <Text style={{ fontSize: 11, color: colors.accentCyan, fontWeight: '700' }}>Edit</Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                  <Text style={{ fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{existingTeacherFb}</Text>
                                  {fbObj.teacherFeedbackEditedAt
                                    ? <Text style={{ fontSize: 10, color: colors.textDim }}>Edited {formatDate(fbObj.teacherFeedbackEditedAt)}</Text>
                                    : fbObj.teacherFeedbackAt ? <Text style={{ fontSize: 10, color: colors.textDim }}>Sent {formatDate(fbObj.teacherFeedbackAt)}</Text> : null}
                                </View>
                              ) : null}

                              {/* Teacher feedback input */}
                              {done && (!existingTeacherFb || editingFeedbackFor === sub.studentId) && (
                                <View style={{ gap: 8 }}>
                                  <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {existingTeacherFb ? 'Edit Feedback' : 'Send Feedback to Student & Parent'}
                                  </Text>
                                  <TextInput
                                    style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                                    placeholder="Write feedback for this student... (visible to student & parent)"
                                    placeholderTextColor={colors.textDim}
                                    value={teacherFeedback}
                                    onChangeText={setTeacherFeedback}
                                    multiline
                                  />
                                  <TouchableOpacity
                                    style={[styles.modalSaveBtn, { backgroundColor: sc, opacity: canSendFb ? 1 : 0.5 }]}
                                    onPress={() => sendFeedback(a.id, sub.studentId)}
                                    disabled={!canSendFb || sendingFeedback}
                                    activeOpacity={0.8}
                                  >
                                    {sendingFeedback ? (
                                      <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                      <>
                                        <Feather name="send" size={14} color="#fff" />
                                        <Text style={styles.modalSaveBtnText}>{existingTeacherFb ? 'Save Changes' : 'Send Feedback'}</Text>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                  {!!existingTeacherFb && (
                                    <TouchableOpacity
                                      onPress={() => { setTeacherFeedback(existingTeacherFb); setEditingFeedbackFor(null); }}
                                      disabled={sendingFeedback}
                                      style={{ alignItems: 'center', paddingVertical: 8 }}
                                    >
                                      <Text style={{ fontSize: 13, color: colors.textDim, fontWeight: '600' }}>Cancel</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* ── QUESTIONS TAB ── */}
            {detailTab === 'questions' && (
              <>
                {/* Worksheet page images at top of Questions tab — tap for fullscreen */}
                {(a.documentUrls?.length ?? 0) > 0 && (
                  <View style={{ gap: 8, marginBottom: 16 }}>
                    <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Worksheet Pages</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      {a.documentUrls!.map((url: string, idx: number) => (
                        <TouchableOpacity key={idx} activeOpacity={0.8} onPress={() => onImagePress(url)}>
                          <View style={{ width: 160, marginHorizontal: 4, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: sc + '40' }}>
                            <Image source={{ uri: url }} style={{ width: 160, height: 210 }} resizeMode="contain" />
                            <View style={{ paddingVertical: 3, backgroundColor: sc + '15', alignItems: 'center' }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: sc }}>Page {idx + 1}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {/* Interactive-quiz assignments (PDF → quiz pipeline) don't populate
                    quizQuestions/questions/taskSteps at all — the actual questions
                    live inside interactiveQuizHtml. Without this branch, the tab
                    always fell through to "No questions added." even though a real
                    quiz clearly exists (teacher can see it render for students). */}
                {(a as any).interactiveQuizHtml ? (
                  <View style={{ gap: 12 }}>
                    <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Generated Interactive Quiz</Text>
                    {Platform.OS === 'web' ? (
                      <iframe
                        srcDoc={(a as any).interactiveQuizHtml}
                        style={{ width: '100%', height: 650, border: 'none', borderRadius: 8, backgroundColor: '#1C1C1C' }}
                      />
                    ) : (
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: sc, borderRadius: radius.md, paddingVertical: 12 }}
                        onPress={() => onPreviewHtml((a as any).interactiveQuizHtml)}
                        activeOpacity={0.85}
                      >
                        <Feather name="eye" size={16} color="#fff" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>View Full Interactive Quiz</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : allQs.length === 0 && (a.documentUrls?.length ?? 0) === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                    <Feather name="help-circle" size={32} color={colors.textDim} />
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>No questions added.</Text>
                  </View>
                ) : allQs.length === 0 ? null : (a as any).quizQuestions?.length > 0 ? (
                  /* MCQ quiz questions */
                  <View style={{ gap: 14 }}>
                    {(a as any).quizQuestions.map((q: any, i: number) => (
                      <View key={i} style={{ backgroundColor: colors.cardDark, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.borderColor, gap: 8 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Text style={{ fontSize: 12, color: sc, fontWeight: '800', minWidth: 24 }}>Q{i + 1}.</Text>
                          <Text style={{ fontSize: 13, color: colors.textMain, flex: 1, lineHeight: 18, fontWeight: '600' }}>{q.question}</Text>
                        </View>
                        {Array.isArray(q.options) && q.options.map((opt: string, oi: number) => {
                          const letter = ['A','B','C','D'][oi];
                          const isAnswer = opt === q.answer || letter === q.answer;
                          return (
                            <View key={oi} style={{ flexDirection: 'row', gap: 8, marginLeft: 24, alignItems: 'center' }}>
                              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderColor: isAnswer ? sc : colors.borderColor, backgroundColor: isAnswer ? sc + '25' : 'transparent' }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: isAnswer ? sc : colors.textDim }}>{letter}</Text>
                              </View>
                              <Text style={{ fontSize: 12, color: isAnswer ? sc : colors.textMuted, fontWeight: isAnswer ? '700' : '400', flex: 1 }}>{opt}</Text>
                              {isAnswer && <Feather name="check" size={12} color={sc} />}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ) : (a.taskSteps?.length ?? 0) > 0 ? (
                  /* IB PYP task steps */
                  <View style={{ gap: 10 }}>
                    {a.taskSteps!.map((step: any, i: number) => (
                      <View key={i} style={{ backgroundColor: colors.cardDark, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.borderColor, gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: sc + '25', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: sc }}>{i + 1}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain, flex: 1 }}>{step.label || step.type}</Text>
                        </View>
                        {step.provocation ? <Text style={{ fontSize: 12, color: colors.textMain, lineHeight: 17, marginLeft: 32, fontStyle: 'italic' }}>{step.provocation}</Text> : null}
                        {step.instructions ? <Text style={{ fontSize: 12, color: colors.textMuted, lineHeight: 17, marginLeft: 32 }}>{step.instructions}</Text> : null}
                        {Array.isArray(step.sections) && step.sections.length > 0 && (
                          <View style={{ marginLeft: 32, gap: 4 }}>
                            {step.sections.map((sec: string, si: number) => (
                              <View key={si} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: sc + '80' }} />
                                <Text style={{ fontSize: 12, color: colors.textMuted }}>{sec}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {Array.isArray(step.problems) && step.problems.length > 0 && (
                          <View style={{ marginLeft: 32, gap: 4 }}>
                            {step.problems.map((p: string, pi: number) => (
                              <Text key={pi} style={{ fontSize: 12, color: colors.textMain }}>{pi + 1}. {p}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  /* Plain text / structured questions with images */
                  <View style={{ gap: 10 }}>
                    {allQs.map((q: any, i: number) => {
                      const qText = typeof q === 'string' ? q : (q.question || q.label || '');
                      const expectedAns = typeof q === 'object' && q.expectedAnswer ? q.expectedAnswer : null;
                      const qImage = typeof q === 'object' && q.croppedImage ? q.croppedImage : null;
                      const qComment = typeof q === 'object' && q.comment ? q.comment : null;
                      return (
                        <View key={i} style={{ backgroundColor: colors.cardDark, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.borderColor, gap: 8 }}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Text style={{ fontSize: 12, color: sc, fontWeight: '800', minWidth: 24 }}>Q{i + 1}.</Text>
                            <Text style={{ fontSize: 13, color: colors.textMain, flex: 1, lineHeight: 18, fontWeight: '600' }}>{qText}</Text>
                          </View>
                          {qImage ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => onImagePress(qImage)} style={{ marginLeft: 32 }}>
                              <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.accentCyan + '40' }}>
                                <Image source={{ uri: qImage }} style={{ width: '100%', height: 160, backgroundColor: '#fff' }} resizeMode="contain" />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', paddingVertical: 3, backgroundColor: colors.bgDark }}>
                                  <Feather name="image" size={9} color={colors.accentCyan} />
                                  <Text style={{ fontSize: 9, color: colors.accentCyan }}>Reference Image — tap to enlarge</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ) : null}
                          {expectedAns ? (
                            <View style={{ flexDirection: 'row', gap: 6, marginLeft: 32, alignItems: 'center' }}>
                              <Feather name="check-circle" size={12} color={colors.accentGreen} />
                              <Text style={{ fontSize: 12, color: colors.accentGreen, flex: 1 }}>Expected: {expectedAns}</Text>
                            </View>
                          ) : null}
                          {qComment ? (
                            <View style={{ flexDirection: 'row', gap: 6, marginLeft: 32, alignItems: 'center' }}>
                              <Feather name="message-circle" size={12} color={colors.accentYellow} />
                              <Text style={{ fontSize: 12, color: colors.accentYellow, fontStyle: 'italic', flex: 1 }}>{qComment}</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
