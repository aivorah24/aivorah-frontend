import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { RosterStudent } from '../types';
import { minutesLabel, lastActiveLabel, initials } from '../utils/formatters';

interface Props {
  colors: AppColors;
  gold: string;
  students: RosterStudent[];
  loading: boolean;
  mode: 'today' | 'overall';
  onModeChange: (mode: 'today' | 'overall') => void;
}

const COL = { idx: 32, name: 150, time: 220, quiz: 100, active: 100, progress: 170 };
const ROWS_PER_PAGE = 10;

// Only the Learning Path has a real per-day column; Assignments/Challenges
// have no equivalent "today" tracking anywhere in the schema. Showing 0m for
// them in Today mode would look like real data — show an honest "not
// tracked" dash instead.
function timeCell(minutes: number | null): string {
  return minutes == null ? '—' : minutesLabel(minutes);
}

export default function ActivityTable({ colors, gold, students, loading, mode, onModeChange }: Props) {
  const [page, setPage] = useState(0);

  // Reset to page 1 whenever the underlying (possibly filtered) list
  // shrinks below the current page — avoids landing on an empty page after
  // applying a filter.
  const maxPage = Math.max(0, Math.ceil(students.length / ROWS_PER_PAGE) - 1);
  const safePage = Math.min(page, maxPage);
  const pageStudents = students.slice(safePage * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE);

  if (loading) return null;
  if (students.length === 0) return null;

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMain }}>Activity & Performance</Text>
          <Text style={{ fontSize: 10.5, color: colors.textDim, marginBottom: 8 }}>Time spent across the Learning Path, Assignments, and Challenges — not a single-surface count</Text>
        </View>

        {/* Section 7/10 — Today/Overall toggle, scoped to this section only. */}
        <View style={{ flexDirection: 'row', borderRadius: 8, borderWidth: 1, borderColor: colors.borderColor, overflow: 'hidden' }}>
          {(['today', 'overall'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              testID={`activity-mode-${m}`}
              onPress={() => onModeChange(m)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6,
                backgroundColor: mode === m ? gold + '20' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 11.5, fontWeight: mode === m ? '700' : '500', color: mode === m ? gold : colors.textMuted, textTransform: 'capitalize' }}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 720 }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor, paddingBottom: 8 }}>
            <Text style={{ width: COL.idx, fontSize: 11, fontWeight: '700', color: colors.textMuted }}>#</Text>
            <Text style={{ width: COL.name, fontSize: 11, fontWeight: '700', color: colors.textMuted }}>Student</Text>
            <View style={{ width: COL.time, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'capitalize' }}>Time Spent ({mode})</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 4 }}>
                <Text style={{ fontSize: 9, color: colors.textDim }}>Path</Text>
                <Text style={{ fontSize: 9, color: colors.textDim }}>Assignments</Text>
                <Text style={{ fontSize: 9, color: colors.textDim }}>Challenges</Text>
              </View>
            </View>
            <Text style={{ width: COL.quiz, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>Best Quiz Score</Text>
            <Text style={{ width: COL.active, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>Last Active</Text>
            <Text style={{ width: COL.progress, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>Learning Path Progress</Text>
          </View>

          {pageStudents.map((s, idx) => {
            const pathMinutes = mode === 'today' ? s.learningPathTimeToday : s.learningPathTime;
            const assignmentMinutes = mode === 'today' ? null : s.assignmentTime;
            const challengeMinutes = mode === 'today' ? null : s.challengeTime;
            return (
              <View key={s.id} testID={`activity-row-${s.id}`} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderColor + '80', paddingVertical: 10 }}>
                <Text style={{ width: COL.idx, fontSize: 12, color: colors.textMain }}>{safePage * ROWS_PER_PAGE + idx + 1}</Text>
                <View style={{ width: COL.name, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: gold + '30', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: gold }}>{initials(s.name)}</Text>
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textMain, fontWeight: '500', flexShrink: 1 }}>{s.name}</Text>
                  {s.needsAttention && <View testID={`needs-attention-${s.id}`} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F44336' }} />}
                </View>
                <View style={{ width: COL.time, flexDirection: 'row', justifyContent: 'space-around' }}>
                  <Text style={{ fontSize: 11, color: colors.textDim }}>{timeCell(pathMinutes)}</Text>
                  <Text style={{ fontSize: 11, color: colors.textDim }}>{timeCell(assignmentMinutes)}</Text>
                  <Text style={{ fontSize: 11, color: colors.textDim }}>{timeCell(challengeMinutes)}</Text>
                </View>
                {s.quizAttempts === 0 ? (
                  <Text style={{ width: COL.quiz, fontSize: 10, color: colors.textDim, textAlign: 'center' }}>No quiz attempts</Text>
                ) : (
                  <Text style={{ width: COL.quiz, fontSize: 12, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>{s.quizBestScore != null ? `${s.quizBestScore}%` : '—'}</Text>
                )}
                <Text style={{ width: COL.active, fontSize: 12, color: colors.textMain, textAlign: 'center' }}>{lastActiveLabel(s.lastActive)}</Text>
                <View style={{ width: COL.progress, paddingHorizontal: 10 }}>
                  {s.totalTopics === 0 ? (
                    // A real 0% (genuinely zero of a real total) looks
                    // identical to "no topic count to measure against at
                    // all" as an empty bar — say which one this is rather
                    // than rendering an ambiguous blank.
                    <Text style={{ fontSize: 10, color: colors.textDim }}>No topic data{s.scopedSubjects.length ? ` for ${s.scopedSubjects.join(', ')}` : ''}</Text>
                  ) : (
                    <>
                      <Text style={{ fontSize: 10, color: colors.textDim, marginBottom: 3 }}>
                        {s.grade} · {s.completedTopics.length} / {s.totalTopics} topics
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ flex: 1, height: 6, backgroundColor: colors.borderColor, borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, s.progressPct))}%`, backgroundColor: gold, borderRadius: 3 }} />
                        </View>
                        <Text style={{ fontSize: 10, color: colors.textDim, width: 30 }}>{s.progressPct}%</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderColor }}>
        <Text style={{ fontSize: 11, color: colors.textDim }}>
          Showing {pageStudents.length} of {students.length} student{students.length === 1 ? '' : 's'}
        </Text>
        {students.length > ROWS_PER_PAGE && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 11, color: colors.textDim }}>Rows per page: {ROWS_PER_PAGE}</Text>
            <TouchableOpacity testID="activity-page-prev" disabled={safePage === 0} onPress={() => setPage((p) => Math.max(0, p - 1))}>
              <Feather name="chevron-left" size={16} color={safePage === 0 ? colors.borderColor : colors.textMain} />
            </TouchableOpacity>
            <TouchableOpacity testID="activity-page-next" disabled={safePage >= maxPage} onPress={() => setPage((p) => Math.min(maxPage, p + 1))}>
              <Feather name="chevron-right" size={16} color={safePage >= maxPage ? colors.borderColor : colors.textMain} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
