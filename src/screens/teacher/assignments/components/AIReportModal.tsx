import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { Assignment } from '../types';

// AI Report Modal (teacher view of a student's AI-graded assignment) —
// moved verbatim (no behavior change) from a bottom-of-file local component
// in TeacherAssignmentsScreen.tsx into its own file, sixteenth step of its
// hooks/components decomposition (2026-08-25).
export function AIReportModal({ assignment, colors, onClose }: { assignment: Assignment; colors: AppColors; onClose: () => void }) {
  const color = colors.accentYellow;

  let feedbackText = '';
  let stamp = '';
  let wellDone = '';
  let improve = '';
  let perQuestion: any[] = [];
  try {
    const parsed = JSON.parse(assignment.aiFeedback || '{}');
    feedbackText  = parsed.text        || '';
    stamp         = parsed.stamp       || '';
    wellDone      = parsed.wellDone    || '';
    improve       = parsed.improve     || '';
    perQuestion   = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [];
  } catch {
    feedbackText = assignment.aiFeedback || '';
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', borderWidth: 1, borderBottomWidth: 0, borderColor: colors.borderColor }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.borderColor, gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="bar-chart-2" size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textMain }} numberOfLines={1}>{assignment.title}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>AI Assessment Report</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Feather name="x" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
            {/* Score + Stamp */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, alignItems: 'center', padding: 20, borderRadius: 14, backgroundColor: color + '12', borderWidth: 1, borderColor: color + '30' }}>
                <Text style={{ fontSize: 42, fontWeight: '900', color, letterSpacing: -1 }}>
                  {assignment.score != null ? `${assignment.score}%` : '--'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color, marginTop: 4 }}>Overall Score</Text>
              </View>
              {stamp ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, backgroundColor: colors.bgDark, borderWidth: 1, borderColor: colors.borderColor }}>
                  <Feather name="award" size={24} color={color} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color, textAlign: 'center', marginTop: 8 }}>{stamp}</Text>
                </View>
              ) : null}
            </View>

            {/* Overall feedback */}
            {feedbackText ? (
              <View style={{ backgroundColor: colors.bgDark, borderRadius: 12, padding: 16, gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>Overall Feedback</Text>
                <Text style={{ fontSize: 14, color: colors.textMain, lineHeight: 22 }}>{feedbackText}</Text>
              </View>
            ) : null}

            {/* Well done + Improve */}
            {wellDone ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accentGreen + '40', backgroundColor: colors.accentGreen + '08' }}>
                <Feather name="check-circle" size={16} color={colors.accentGreen} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentGreen, textTransform: 'uppercase' }}>Strength</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{wellDone}</Text>
                </View>
              </View>
            ) : null}
            {improve ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '08' }}>
                <Feather name="target" size={16} color={colors.accentYellow} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentYellow, textTransform: 'uppercase' }}>Needs Improvement</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{improve}</Text>
                </View>
              </View>
            ) : null}

            {/* Per-question breakdown */}
            {perQuestion.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8 }}>Question Analysis</Text>
                {perQuestion.map((q: any, idx: number) => {
                  const qColor = !q.answered ? colors.textDim
                    : q.correct ? colors.accentGreen
                    : q.score >= 50 ? colors.accentYellow
                    : colors.accentRed;
                  const qIcon = !q.answered ? 'minus-circle' : q.correct ? 'check-circle' : q.score >= 50 ? 'alert-circle' : 'x-circle';
                  return (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: qColor + '40', backgroundColor: qColor + '08' }}>
                      <Feather name={qIcon as any} size={16} color={qColor} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: qColor }}>Q{q.number ?? idx + 1}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMain, lineHeight: 18, marginBottom: 3 }} numberOfLines={2}>{q.question}</Text>
                        <Text style={{ fontSize: 12, color: q.answered ? colors.textMuted : qColor, lineHeight: 17 }}>{q.comment}</Text>
                        {q.studentAnswer ? (
                          <Text style={{ fontSize: 11, color: colors.textDim, marginTop: 3, fontStyle: 'italic' }}>Student wrote: {q.studentAnswer}</Text>
                        ) : null}
                      </View>
                      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: qColor + '20' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: qColor }}>{q.answered ? `${q.score}%` : '--'}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, backgroundColor: color }}
              onPress={onClose} activeOpacity={0.85}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Close Report</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
