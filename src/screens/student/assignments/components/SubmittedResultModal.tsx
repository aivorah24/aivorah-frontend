import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { SUBJECT_COLOR } from '../constants';
import { getStamp, scoreBadge } from '../utils';
import type { Assignment } from '../types';

// ── Submitted Result Modal (shown immediately after AI grading) ──
export function SubmittedResultModal({
  assignment: a, data, colors, onClose,
}: {
  assignment: Assignment;
  data: any;
  colors: AppColors;
  onClose: () => void;
}) {
  const sc = SUBJECT_COLOR[a.subject] ?? colors.accentYellow;
  const stamp = getStamp(data.score ?? data.score);
  let feedbackText = ''; let wellDone = ''; let improve = ''; let pq: any[] = []; let teacherFb = '';
  try {
    const parsed = JSON.parse(data.aiFeedback || '{}');
    feedbackText = parsed.text || '';
    wellDone = parsed.wellDone || '';
    improve = parsed.improve || '';
    pq = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [];
    teacherFb = parsed.teacherFeedback || '';
  } catch {
    feedbackText = data.aiFeedback || '';
    pq = Array.isArray(data.perQuestion) ? data.perQuestion : [];
  }
  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: sc + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="check-circle" size={20} color={sc} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }}>{a.title}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{a.subject}{a.chapter ? ` · ${a.chapter}` : ''}</Text>
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 720, alignSelf: 'center', width: '100%' }}>
          {/* Score */}
          <View style={{ alignItems: 'center', padding: 28, borderRadius: 20, backgroundColor: sc + '10', borderWidth: 1, borderColor: sc + '25', gap: 8 }}>
            <Text style={{ fontSize: 56, fontWeight: '900', color: sc, letterSpacing: -2 }}>{data.score != null ? `${data.score}%` : 'Done'}</Text>
            {stamp && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name={stamp.icon as any} size={18} color={stamp.color} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: stamp.color }}>{stamp.label}</Text>
              </View>
            )}
            <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
              {data.score != null ? data.score >= 85 ? 'Excellent work!' : data.score >= 60 ? 'Good effort!' : 'Keep going!' : 'Submitted successfully'}
            </Text>
          </View>
          {/* Feedback */}
          {feedbackText ? (
            <View style={{ backgroundColor: colors.cardDark, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.borderColor, gap: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>AI Feedback</Text>
              <Text style={{ fontSize: 14, color: colors.textMain, lineHeight: 22 }}>{feedbackText}</Text>
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
          {/* Per question breakdown */}
          {pq.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>Question by Question · {pq.filter((q: any) => q && q.answered !== false).length} of {pq.filter(Boolean).length} answered</Text>
              {pq.filter(Boolean).map((q: any, idx: number) => {
                const badge = scoreBadge(q);
                const qsc = colors[badge.colorKey];
                return (
                  <View key={idx} style={{ borderRadius: 10, borderWidth: 1, borderColor: qsc + '40', backgroundColor: colors.cardDark, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: qsc + '0A' }}>
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: colors.textMain }} numberOfLines={2}>Q{idx + 1}. {q.stepLabel || q.question || 'Question'}</Text>
                      <View style={{ backgroundColor: qsc + '25', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: qsc }}>{badge.label}</Text>
                      </View>
                    </View>
                    {(q.studentAnswer || q.comment) ? (
                      <View style={{ padding: 10, gap: 5 }}>
                        {q.studentAnswer ? <Text style={{ fontSize: 11, color: colors.textMuted, lineHeight: 16 }} numberOfLines={2}>{q.studentAnswer}</Text> : null}
                        {q.comment ? <Text style={{ fontSize: 11, color: colors.textMain, lineHeight: 16 }}>{q.comment}</Text> : null}
                        {(q.score ?? 0) < 100 && q.answered !== false && !q.needsReview && q.correctAnswer ? (
                          <Text style={{ fontSize: 11, color: colors.accentYellow, lineHeight: 16 }}><Text style={{ fontWeight: '700' }}>To get 100%: </Text>{q.correctAnswer}</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
          {teacherFb ? (
            <View style={{ backgroundColor: colors.accentYellow + '0E', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.accentYellow + '30', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="user" size={13} color={colors.accentYellow} />
                <Text style={{ fontSize: 12, color: colors.accentYellow, fontWeight: '700' }}>Teacher Feedback</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.textMain, lineHeight: 20 }}>{teacherFb}</Text>
            </View>
          ) : null}
          <TouchableOpacity onPress={onClose} activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 14, backgroundColor: sc }}>
            <Feather name="check" size={16} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
