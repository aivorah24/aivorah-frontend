import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../theme';
import Header from '../../../components/common/Header';
import ScreenLayout from '../../../components/common/ScreenLayout';
import DatePicker from '../../../components/common/DatePicker';
import { useTheme } from '../../../context/ThemeContext';
import { useParentAssignments, FILTERS, TYPES } from './hooks/useParentAssignments';
import { useChildDeepLink } from '../../../hooks/useChildDeepLink';
import { makeStyles } from './styles';
import AssignmentDetailModal from './components/AssignmentDetailModal';
import ParentAIReportModal from './components/ParentAIReportModal';

function formatDue(iso: string): { label: string; isOverdue: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(iso); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: 'Pending', isOverdue: false };
  if (diff === 0) return { label: 'Due today', isOverdue: false };
  if (diff === 1) return { label: 'Due tomorrow', isOverdue: false };
  return { label: `Due ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, isOverdue: false };
}

export default function ParentAssignmentsScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const twoCol = winWidth >= 768; // 2-up grid on desktop/tablet, single column on phones
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const {
    children, selectedIdx, setSelectedIdx, child,
    activeFilter, setActiveFilter, filtered, assignments, assignmentsChildId,
    loading, completed, pending, totalStudyMins, completionPct, onTrackPct,
    showModal, setShowModal, reportAssignment, setReportAssignment,
    detailAssignment, setDetailAssignment,
    title, setTitle, subject, setSubject, subjectOptions,
    chapter, setChapter, dueDate, setDueDate, type, setType, note, setNote,
    questions, setQuestions, quizQuestions,
    creating, formError, setFormError,
    aiPrompt, setAiPrompt, aiGenerating, aiGenerated, quizCount, setQuizCount,
    curriculumTopics, showTopicPicker, setShowTopicPicker,
    resetForm, generateWithAI, createAssignment,
  } = useParentAssignments();

  const [missingNotice, setMissingNotice] = useState(false);
  useChildDeepLink({
    route, navigation, children, selectedIdx, setSelectedIdx,
    items: assignments, itemsChildId: assignmentsChildId,
    onOpen: (a) => {
      if (!a) { setMissingNotice(true); return; }
      setMissingNotice(false);
      setActiveFilter('All');
      setDetailAssignment(a);
    },
  });

  return (
    <ScreenLayout>
      <View style={styles.screen}>
        <Header
          title="Assignments"
          subtitle={child ? `${child.name} · ${child.grade}` : 'Loading...'}
          searchPlaceholder="Search assignments..."
          onMenuPress={() => navigation.openDrawer()}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {missingNotice && (
            <TouchableOpacity onPress={() => setMissingNotice(false)} activeOpacity={0.8} testID="deeplink-missing-notice"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '10', marginBottom: 12 }}>
              <Feather name="info" size={14} color={colors.accentYellow} />
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: 13 }}>That assignment is no longer available.</Text>
              <Feather name="x" size={14} color={colors.textDim} />
            </TouchableOpacity>
          )}

          {/* Child Selector */}
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childRow}>
              {children.map((c, i) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.childTab, selectedIdx === i && styles.childTabActive]}
                  onPress={() => setSelectedIdx(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.childTabName, { color: selectedIdx === i ? colors.accentYellow : colors.textMuted }]}>{c.name}</Text>
                  <Text style={styles.childTabGrade}>{c.grade}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* This week at a glance */}
          <View style={styles.glanceCard}>
            <View style={styles.glanceHeader}>
              <View>
                <Text style={styles.glanceTitle}>This week at a glance</Text>
                <Text style={styles.glanceSub}>School vs parent tasks · Mon–Sun</Text>
              </View>
              {child && (
                <View style={styles.childBadge}>
                  <Text style={styles.childBadgeText}>{child.name} · {child.grade}</Text>
                </View>
              )}
            </View>
            <View style={styles.glanceStats}>
              <View style={styles.glanceStat}>
                <Text style={styles.glanceStatLabel}>Completed</Text>
                <Text style={styles.glanceStatValue}>{completed}<Text style={styles.glanceStatTotal}> /{assignments.length}</Text></Text>
                <Text style={[styles.glanceStatNote, { color: colors.accentGreen }]}>{completionPct}% done</Text>
              </View>
              <View style={styles.glanceDivider} />
              <View style={styles.glanceStat}>
                <Text style={styles.glanceStatLabel}>Upcoming</Text>
                <Text style={styles.glanceStatValue}>{pending}</Text>
              </View>
              <View style={styles.glanceDivider} />
              <View style={styles.glanceStat}>
                <Text style={styles.glanceStatLabel}>Study Time</Text>
                <Text style={styles.glanceStatValue}>{Math.floor(totalStudyMins / 60)}.{Math.floor((totalStudyMins % 60) / 6)}<Text style={styles.glanceStatTotal}>h</Text></Text>
                {onTrackPct !== null && (
                  <Text style={[styles.glanceStatNote, { color: colors.accentBlue }]}>{onTrackPct}% on track</Text>
                )}
              </View>
            </View>
          </View>

          {/* Filter + New Assignment */}
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.7}
                  accessibilityLabel={`filter-${f}`}
                >
                  <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.newBtn} activeOpacity={0.8} onPress={() => setShowModal(true)}>
              <Feather name="plus" size={14} color="white" />
              <Text style={styles.newBtnText}>New</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>TODAY & UPCOMING</Text>

          {loading ? (
            <ActivityIndicator color={colors.accentYellow} style={{ marginTop: 24 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="check-square" size={32} color={colors.textDim} />
              <Text style={styles.emptyText}>No assignments here</Text>
              {activeFilter === 'Parent' && (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                  <Feather name="plus" size={14} color={colors.accentYellow} />
                  <Text style={styles.emptyAddText}>Add an assignment for {child?.name}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.assignmentList}>
            {filtered.map(a => {
              const due = a.status === 'completed'
                ? { label: (a as any).scoreHidden ? 'Score hidden by teacher' : (a.score != null ? `Score: ${a.score}%` : 'Completed'), isOverdue: false }
                : formatDue(a.dueDate);
              const statusLabel = a.status === 'completed' ? 'Done' : 'Upcoming';
              const statusColor = a.status === 'completed' ? colors.accentGreen : colors.accentBlue;

              return (
                <TouchableOpacity key={a.id} style={[styles.assignmentRow, { width: twoCol ? '48.5%' : '100%' }]} activeOpacity={0.75} onPress={() => setDetailAssignment(a)}>
                  <View style={[styles.assignmentIconSm, { backgroundColor: colors.accentYellow + '18' }]}>
                    <Feather name="book-open" size={14} color={colors.accentYellow} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.assignmentTitle} numberOfLines={1}>{a.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="clock" size={10} color={colors.textDim} />
                      <Text style={[styles.assignmentDue, { color: colors.textMuted }]}>{due.label}</Text>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: colors.accentYellow + '18' }}>
                        <Text style={{ fontFamily: fonts.serif, fontSize: 9, fontWeight: '700', color: colors.accentYellow }}>
                          {a.type === 'quiz' ? 'Quiz' : (a.taskSteps?.length ?? 0) > 0 ? 'Scaffolded' : (a.documentUrls?.length ?? 0) > 0 ? 'Worksheet' : 'Task'}
                        </Text>
                      </View>
                      {a.createdBy === 'parent' && (
                        <Text style={{ fontFamily: fonts.serif, fontSize: 9, color: colors.accentGreen, fontWeight: '600' }}>By you</Text>
                      )}
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '33' }]}>
                    <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            </View>
          )}
        </ScrollView>

        {reportAssignment && (
          <ParentAIReportModal
            assignment={reportAssignment}
            colors={colors}
            onClose={() => setReportAssignment(null)}
          />
        )}

        {detailAssignment && (
          <AssignmentDetailModal
            assignment={detailAssignment}
            colors={colors}
            childName={child?.name ?? ''}
            onClose={() => setDetailAssignment(null)}
          />
        )}

        {/* Create Assignment Modal */}
        <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => { setShowModal(false); resetForm(); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>New Assignment</Text>
                    {child && <Text style={styles.modalSub}>For {child.name} · {child.grade}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }} activeOpacity={0.75}>
                    <Feather name="x" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent} nestedScrollEnabled>

                  {/* Title */}
                  <Text style={styles.fieldLabel}>Title *</Text>
                  <TextInput
                    style={[styles.input, formError && !title.trim() && { borderColor: colors.accentRed }]}
                    placeholder="e.g. Practice fractions worksheet"
                    placeholderTextColor={colors.textDim}
                    value={title}
                    onChangeText={t => { setTitle(t); if (t.trim()) setFormError(''); }}
                  />

                  {/* Subject */}
                  <Text style={styles.fieldLabel}>Subject</Text>
                  <View style={styles.chipRow}>
                    {subjectOptions.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.chip, subject === s && { backgroundColor: colors.accentYellow + '18', borderColor: colors.accentYellow }]}
                        onPress={() => setSubject(s)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, subject === s && { color: colors.accentYellow }]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Chapter / Topic */}
                  <Text style={styles.fieldLabel}>Chapter / Topic</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Chapter 5 — Fractions"
                    placeholderTextColor={colors.textDim}
                    value={chapter}
                    onChangeText={setChapter}
                  />

                  {/* Topic quick-picker from IB PYP curriculum */}
                  {curriculumTopics.filter(t => t.subject === subject).length > 0 && (
                    <View>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}
                        onPress={() => setShowTopicPicker(p => !p)}
                        activeOpacity={0.75}
                      >
                        <Feather name="list" size={13} color={colors.accentYellow} />
                        <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.accentYellow, fontWeight: '700' }}>
                          {showTopicPicker ? 'Hide' : 'Pick from IB PYP topics'}
                        </Text>
                      </TouchableOpacity>
                      {showTopicPicker && (
                        <View style={styles.topicGrid}>
                          {curriculumTopics
                            .filter(t => t.subject === subject)
                            .map((t, i) => (
                              <TouchableOpacity
                                key={i}
                                style={[styles.topicChip, chapter === t.topic && { borderColor: colors.accentYellow, backgroundColor: colors.accentYellow + '18' }]}
                                onPress={() => { setChapter(t.topic); setShowTopicPicker(false); }}
                                activeOpacity={0.75}
                              >
                                <Text style={[styles.topicChipText, chapter === t.topic && { color: colors.accentYellow }]} numberOfLines={2}>
                                  {t.topic}
                                </Text>
                              </TouchableOpacity>
                            ))
                          }
                        </View>
                      )}
                    </View>
                  )}

                  {/* Due Date */}
                  <Text style={styles.fieldLabel}>Due Date *</Text>
                  <DatePicker
                    value={dueDate}
                    onChange={t => { setDueDate(t); if (t.trim()) setFormError(''); }}
                    placeholder="Select a due date"
                    minDate={new Date().toISOString().split('T')[0]}
                  />

                  {/* Type */}
                  <Text style={styles.fieldLabel}>Type</Text>
                  <View style={styles.chipRow}>
                    {TYPES.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.chip, type === t && { backgroundColor: colors.accentYellow + '18', borderColor: colors.accentYellow }]}
                        onPress={() => setType(t)}
                        activeOpacity={0.75}
                      >
                        <Feather name={t === 'quiz' ? 'help-circle' : 'file-text'} size={13} color={type === t ? colors.accentYellow : colors.textMuted} />
                        <Text style={[styles.chipText, type === t && { color: colors.accentYellow }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* ── AI Generate panel (inline, like teacher) ── */}
                  <View style={styles.aiPanel}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Feather name="cpu" size={16} color={colors.accentYellow} />
                      <Text style={styles.aiPanelTitle}>Generate with AI</Text>
                      {aiGenerated && (
                        <View style={{ marginLeft: 'auto' as any, backgroundColor: colors.accentGreen + '20', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontFamily: fonts.serif, fontSize: 10, fontWeight: '700', color: colors.accentGreen }}>Generated</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.aiPanelSub}>
                      Describe what {child?.name ?? 'your child'} needs to practice — AI will fill title, topic, and questions automatically.
                    </Text>

                    <TextInput
                      style={[styles.input, styles.inputMulti, { marginTop: 10 }]}
                      placeholder={`e.g. "Give 5 multiplication word problems for Grade 3" or "Food chain questions in IB PYP standard"`}
                      placeholderTextColor={colors.textDim}
                      value={aiPrompt}
                      onChangeText={setAiPrompt}
                      multiline
                      numberOfLines={3}
                    />

                    {/* Question count (for quiz) */}
                    {type === 'quiz' && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={[styles.fieldLabel, { marginBottom: 6 }]}>Number of Questions</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {[3, 5, 8, 10].map(n => (
                            <TouchableOpacity key={n} onPress={() => setQuizCount(n)} activeOpacity={0.75}
                              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
                                borderColor: quizCount === n ? colors.accentYellow : colors.borderColor,
                                backgroundColor: quizCount === n ? colors.accentYellow + '18' : 'transparent' }}>
                              <Text style={{ fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: quizCount === n ? colors.accentYellow : colors.textMuted }}>{n}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.aiGenerateBtn, { backgroundColor: aiPrompt.trim() ? colors.accentYellow : colors.borderColor }]}
                      onPress={generateWithAI}
                      activeOpacity={0.85}
                      disabled={aiGenerating || !aiPrompt.trim()}
                    >
                      {aiGenerating ? (
                        <ActivityIndicator color="#0B0B0B" size="small" />
                      ) : (
                        <>
                          <Feather name="zap" size={15} color="#0B0B0B" />
                          <Text style={styles.submitBtnText}>Generate Assignment</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* MCQ quiz preview — questions with their 4 options + correct answer */}
                  {type === 'quiz' && quizQuestions.length > 0 && (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.fieldLabel}>Questions</Text>
                      {quizQuestions.map((qq: any, i: number) => (
                        <View key={i} style={{ backgroundColor: colors.cardDark, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderColor, padding: spacing.md, gap: 8 }}>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentYellow, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: fonts.serif, fontSize: 10, fontWeight: '800', color: '#0B0B0B' }}>{i + 1}</Text>
                            </View>
                            <Text style={{ flex: 1, fontFamily: fonts.serif, fontSize: 14, color: colors.textMain, fontWeight: '600' }}>{qq.question}</Text>
                          </View>
                          {Array.isArray(qq.options) && qq.options.map((opt: string, oi: number) => {
                            const isCorrect = String(opt).trim() === String(qq.correct).trim();
                            return (
                              <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 30 }}>
                                <Feather name={isCorrect ? 'check-circle' : 'circle'} size={14} color={isCorrect ? colors.accentGreen : colors.textDim} />
                                <Text style={{ fontFamily: fonts.serif, fontSize: 13, color: isCorrect ? colors.accentGreen : colors.textMuted, fontWeight: isCorrect ? '700' : '500' }}>{opt}</Text>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Plain-text questions preview (assignments, or a quiz with no options).
                      Gates on questions.length, not on any question having text yet - the
                      form starts with a single empty slot (see resetForm), so gating on
                      trimmed content made this block (and the only text input that could
                      ever fill that slot) permanently invisible on a fresh form. */}
                  {!(type === 'quiz' && quizQuestions.length > 0) && questions.length > 0 && (
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.fieldLabel}>Questions</Text>
                        {questions.length < 10 && (
                          <TouchableOpacity onPress={() => setQuestions(prev => [...prev, ''])} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="plus-circle" size={14} color={colors.accentYellow} />
                            <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.accentYellow, fontWeight: '600' }}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {questions.map((q, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentYellow, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontFamily: fonts.serif, fontSize: 10, fontWeight: '800', color: '#0B0B0B' }}>{i + 1}</Text>
                          </View>
                          <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder={`Question ${i + 1}...`}
                            placeholderTextColor={colors.textDim}
                            value={q}
                            onChangeText={t => setQuestions(prev => prev.map((x, j) => j === i ? t : x))}
                          />
                          <TouchableOpacity onPress={() => setQuestions(prev => prev.filter((_, j) => j !== i))} activeOpacity={0.75}>
                            <Feather name="trash-2" size={16} color={colors.accentRed} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Note */}
                  <Text style={styles.fieldLabel}>Note to child (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    placeholder="Instructions or encouragement for your child..."
                    placeholderTextColor={colors.textDim}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.infoNote}>
                    <Feather name="user" size={13} color={colors.accentGreen} />
                    <Text style={styles.infoNoteText}>
                      This assignment will appear in {child?.name ?? 'your child'}&apos;s Assignments screen.
                    </Text>
                  </View>

                  {formError ? (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={13} color={colors.accentRed} />
                      <Text style={styles.errorText}>{formError}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity style={styles.submitBtn} onPress={createAssignment} activeOpacity={0.85} disabled={creating}>
                    {creating ? (
                      <ActivityIndicator color="#0B0B0B" size="small" />
                    ) : (
                      <>
                        <Feather name="send" size={15} color="#0B0B0B" />
                        <Text style={styles.submitBtnText}>Create Assignment</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ScreenLayout>
  );
}
