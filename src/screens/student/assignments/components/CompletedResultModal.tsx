import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../../../context/ThemeContext';
import type { AppColors } from '../../../../theme';
import { getAnsweredQuizHtml } from '../../../../utils/answeredQuizHtml';
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import { SUBJECT_ICON, SUBJECT_COLOR } from '../constants';
import { getStamp } from '../utils';
import type { Assignment } from '../types';

// ── Completed Result Detail Modal ──
export function CompletedResultModal({
  assignment: a, colors, expandedExplain, setExpandedExplain, onClose,
}: {
  assignment: Assignment;
  colors: AppColors;
  expandedExplain: Record<number, { loading: boolean; steps?: string[]; correctAnswer?: string; tip?: string }>;
  setExpandedExplain: React.Dispatch<React.SetStateAction<Record<number, { loading: boolean; steps?: string[]; correctAnswer?: string; tip?: string }>>>;
  onClose: () => void;
}) {
  const { isDark } = useTheme();
  const sc = SUBJECT_COLOR[a.subject] ?? colors.accentYellow;
  let feedbackText = ''; let wellDone = ''; let improve = ''; let pq: any[] = []; let teacherFb = '';
  try {
    const parsed = JSON.parse(a.aiFeedback || '{}');
    feedbackText = parsed.text || '';
    wellDone = parsed.wellDone || '';
    improve = parsed.improve || '';
    pq = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [];
    teacherFb = parsed.teacherFeedback || '';
  } catch { feedbackText = a.aiFeedback || ''; }
  // Interactive quizzes store answers in submission_text (surfaced as
  // a.perQuestion by the server), not ai_feedback — prefer that.
  if ((a as any).perQuestion?.length) pq = (a as any).perQuestion;
  const stampData = getStamp(a.score);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
       <View style={{ backgroundColor: colors.bgDark, borderRadius: 18, maxHeight: '92%', width: '100%', maxWidth: 820, borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: sc + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name={(SUBJECT_ICON[a.subject] ?? 'book-open') as any} size={18} color={sc} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>{a.title}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{a.subject}{a.chapter ? ` · ${a.chapter}` : ''}</Text>
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, gap: 10, maxWidth: 720, alignSelf: 'center', width: '100%' }}>
          {/* Score badge — use accentYellow (readable in both themes) for the
               number/stamp; pale subject colours wash out on the cream bg. */}
          <View style={{ alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.accentYellow + '12', borderWidth: 1, borderColor: colors.accentYellow + '30' }}>
            <Text style={{ fontSize: 40, fontWeight: '900', color: colors.accentYellow, letterSpacing: -1.5 }}>{a.score ?? 0}%</Text>
            {stampData && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Feather name={stampData.icon as any} size={16} color={stampData.color} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accentYellow }}>{stampData.label}</Text>
              </View>
            )}
          </View>

          {/* AI Feedback summary */}
          {feedbackText ? (
            <View style={{ backgroundColor: colors.cardDark, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.borderColor, gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>AI Feedback</Text>
              <Text style={{ fontSize: 14, color: colors.textMain, lineHeight: 22 }}>{feedbackText}</Text>
            </View>
          ) : null}

          {/* ── Submitted worksheet (interactive quizzes) — the same answered
               view the teacher sees: the student's answers filled in and
               colour-marked. Shown only when there's an interactive quiz +
               recorded per-question answers. */}
          {a.interactiveQuizHtml && pq.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>Your Submitted Worksheet</Text>
              <View style={{ height: 520, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderColor, backgroundColor: '#0F0F0F' }}>
                {Platform.OS === 'web' ? (
                  <View
                    style={{ flex: 1 } as any}
                    ref={(el: any) => {
                      if (el && !(el as any)._answered) {
                        (el as any)._answered = true;
                        const answered = getAnsweredQuizHtml(a.interactiveQuizHtml!, { perQuestion: pq });
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
                    source={{ html: getAnsweredQuizHtml(a.interactiveQuizHtml!, { perQuestion: pq }) }}
                    style={{ flex: 1, backgroundColor: '#0F0F0F' }}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    domStorageEnabled
                  />
                )}
              </View>
            </View>
          ) : null}

          {/* Well done / improve */}
          {(wellDone || improve) ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {wellDone ? (
                <View style={{ flex: 1, backgroundColor: colors.accentGreen + '10', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.accentGreen + '25', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Feather name="star" size={12} color={colors.accentGreen} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accentGreen, textTransform: 'uppercase' }}>Well Done</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{wellDone}</Text>
                </View>
              ) : null}
              {improve ? (
                <View style={{ flex: 1, backgroundColor: colors.accentYellow + '10', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.accentYellow + '25', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Feather name="trending-up" size={12} color={colors.accentYellow} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accentYellow, textTransform: 'uppercase' }}>Next Step</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{improve}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* ── Questions You Got Right ── (hidden for interactive quizzes —
               those have no per-question text; the submitted worksheet above
               already shows every answer marked). */}
          {!a.interactiveQuizHtml && pq.filter((q: any) => q.correct).length > 0 && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.accentGreen + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="check-circle" size={15} color={colors.accentGreen} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.accentGreen }}>
                  Questions You Got Right ({pq.filter((q: any) => q.correct).length})
                </Text>
              </View>
              {pq.filter((q: any) => q.correct).map((q: any, i: number) => (
                <View key={i} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: colors.accentGreen + '30', borderLeftColor: colors.accentGreen, backgroundColor: colors.cardDark, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentGreen + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Feather name="check" size={12} color={colors.accentGreen} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.textMain, lineHeight: 20 }}>{q.question}</Text>
                  </View>
                  {q.studentAnswer ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: colors.bgDark, marginLeft: 32 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentGreen, width: 90 }}>Your answer</Text>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.accentGreen }}>{q.studentAnswer}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* ── Questions You Got Wrong ── (also hidden for interactive quizzes) */}
          {!a.interactiveQuizHtml && pq.filter((q: any) => !q.correct && q.answered).length > 0 && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#BAA46720', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="x-circle" size={15} color="#BAA467" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#BAA467' }}>
                  Questions You Got Wrong ({pq.filter((q: any) => !q.correct && q.answered).length})
                </Text>
              </View>
              {pq.filter((q: any) => !q.correct && q.answered).map((q: any, i: number) => {
                const exp = expandedExplain[i];
                const fetchExpl = async () => {
                  if (exp?.steps) { setExpandedExplain(prev => { const n = { ...prev }; delete n[i]; return n; }); return; }
                  setExpandedExplain(prev => ({ ...prev, [i]: { loading: true } }));
                  try {
                    const r = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/${a.id}/explain-question`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ question: q.question, studentAnswer: q.studentAnswer, correctAnswer: q.correctAnswer, score: q.score, subject: a.subject, grade: a.grade }),
                    });
                    const data = await r.json();
                    setExpandedExplain(prev => ({ ...prev, [i]: { loading: false, steps: data.steps || [], correctAnswer: data.correctAnswer || q.correctAnswer || '', tip: data.tip || '' } }));
                  } catch {
                    setExpandedExplain(prev => ({ ...prev, [i]: { loading: false, steps: [], correctAnswer: q.correctAnswer || '', tip: '' } }));
                  }
                };
                return (
                  <View key={i} style={{ padding: 14, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: '#BAA46730', borderLeftColor: '#BAA467', backgroundColor: colors.cardDark, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#BAA46720', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <Feather name="x" size={12} color="#BAA467" />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.textMain, lineHeight: 20 }}>{q.question}</Text>
                    </View>
                    <View style={{ gap: 6, marginLeft: 32 }}>
                      {q.studentAnswer ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: colors.bgDark }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#C9A24E', width: 100 }}>Your answer</Text>
                          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#C9A24E' }}>{q.studentAnswer}</Text>
                        </View>
                      ) : null}
                      {(q.correctAnswer || (q.comment && q.comment.includes('correct answer'))) ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8, backgroundColor: colors.bgDark }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#BAA467', width: 100 }}>Correct answer</Text>
                          <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#BAA467' }}>
                            {q.correctAnswer || q.comment?.replace(/.*correct answer[:\s]*/i, '').trim()}
                          </Text>
                        </View>
                      ) : null}
                      {/* Aivorah explanation */}
                      {exp?.steps && exp.steps.length > 0 ? (
                        <View style={{ padding: 12, borderRadius: 10, backgroundColor: isDark ? '#171612' : '#F8F6ED', borderWidth: 1, borderColor: '#BAA46725', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: '#BAA46720', alignItems: 'center', justifyContent: 'center' }}>
                              <Feather name="book-open" size={11} color="#BAA467" />
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#BAA467' }}>Aivorah explains</Text>
                            <TouchableOpacity onPress={fetchExpl} style={{ marginLeft: 'auto' as any }}>
                              <Feather name="chevron-up" size={14} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                          {exp.steps.map((step: string, si: number) => (
                            <View key={si} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accentGreen }}>{si + 1}</Text>
                              </View>
                              <Text style={{ flex: 1, fontSize: 12, color: colors.textMain, lineHeight: 18 }}>{step.replace(/^Step \d+:\s*/i, '')}</Text>
                            </View>
                          ))}
                          {exp.tip ? (
                            <Text style={{ fontSize: 12, color: colors.accentGreen, fontStyle: 'italic', lineHeight: 18 }}>{exp.tip}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <TouchableOpacity onPress={fetchExpl} activeOpacity={0.75}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#BAA46715', borderWidth: 1, borderColor: '#BAA46740' }}>
                          {exp?.loading
                            ? <><ActivityIndicator size="small" color="#BAA467" /><Text style={{ fontSize: 12, color: '#BAA467', fontWeight: '700' }}>Aivorah is thinking…</Text></>
                            : <><Feather name="help-circle" size={13} color="#BAA467" /><Text style={{ fontSize: 12, color: '#BAA467', fontWeight: '700' }}>Aivorah, explain this</Text></>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Teacher feedback */}
          {teacherFb ? (
            <View style={{ borderRadius: 12, padding: 14, backgroundColor: colors.accentYellow + '0E', borderWidth: 1, borderColor: colors.accentYellow + '30', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="user" size={13} color={colors.accentYellow} />
                <Text style={{ fontSize: 12, color: colors.accentYellow, fontWeight: '700' }}>Teacher Feedback</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 20 }}>{teacherFb}</Text>
            </View>
          ) : null}

          {/* Close button */}
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={onClose} activeOpacity={0.85}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, backgroundColor: sc }}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Done</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
          </View>
        </ScrollView>
       </View>
      </View>
    </Modal>
  );
}
