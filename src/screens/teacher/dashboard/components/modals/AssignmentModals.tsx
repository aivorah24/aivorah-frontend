import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatStudyTime } from '../../utils/dashboardHelpers';
import { initials, ModalRenderCtx } from './modalTypes';

// Cases 4-6 of the old renderInsightModalContent switch — Assignment column's
// 3 tiles (Pending / Avg Score / Submitted). Extracted verbatim.
export function renderAssignmentModal(tileIndex: number, ctx: ModalRenderCtx) {
  const { tile, students, assignStats, classAvgScore, studentsWithSubmissions, styles, colors, onClose } = ctx;

  switch (tileIndex) {
    case 4: { // Pending — students with no submissions
      const noSubs = (assignStats as any[]).filter((s: any) => s.submitted === 0);
      // One Assigned/Submitted pair per subject this teacher teaches (Mathematics,
      // English, ...), plus a Total column — same clear-breakdown approach as the
      // Learning Path Leaderboard, so nothing is a single ambiguous combined number.
      const pendingSubjectCols = [...new Set(noSubs.flatMap((s: any) => s.scopedSubjects || []))] as string[];
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{noSubs.length} Students</Text>
              <Text style={styles.modalHeading}>No Assignments Submitted Yet</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 1.6 }]}>Student</Text>
            {pendingSubjectCols.map(subj => (
              <Text key={subj} style={[styles.tableCol, { flex: 1.3, textAlign: 'center' }]}>{subj}</Text>
            ))}
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Total</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {noSubs.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Feather name="check-circle" size={28} color="#5A8A70" />
                <Text style={styles.modalEmptyText}>Everyone has submitted at least one assignment!</Text>
              </View>
            ) : noSubs.map((s: any, i: number) => (
              <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, { flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                    <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                  </View>
                  <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                </View>
                {pendingSubjectCols.map(subj => {
                  const bySubj = (s.bySubject || {})[subj] || { assigned: 0, submitted: 0 };
                  return (
                    <View key={subj} style={[styles.tableCell, { flex: 1.3, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain }}>{bySubj.submitted}/{bySubj.assigned}</Text>
                    </View>
                  );
                })}
                {(() => {
                  // Total must equal the sum of the subject columns shown — not the raw
                  // assigned/submitted count, which can include legacy assignments from
                  // before subject-tagging existed and would otherwise not add up visibly.
                  const totalAssigned = pendingSubjectCols.reduce((sum, subj) => sum + ((s.bySubject || {})[subj]?.assigned || 0), 0);
                  const totalSubmitted = pendingSubjectCols.reduce((sum, subj) => sum + ((s.bySubject || {})[subj]?.submitted || 0), 0);
                  return (
                    <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#B8797E' }}>{totalSubmitted}/{totalAssigned}</Text>
                    </View>
                  );
                })()}
              </View>
            ))}
          </ScrollView>
        </>
      );
    }

    case 5: { // Avg Score — all students ranked by assignment avg score
      const ranked = [...(assignStats as any[])].filter((s: any) => s.avgScore != null).sort((a: any, b: any) => b.avgScore - a.avgScore);
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{classAvgScore != null ? `${classAvgScore}%` : '—'}</Text>
              <Text style={styles.modalHeading}>Assignment Scores by Student</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { width: 32, textAlign: 'center' }]}>#</Text>
            <Text style={[styles.tableCol, { flex: 2 }]}>Student</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Submitted</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Avg Score</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ranked.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Feather name="bar-chart-2" size={28} color={colors.textDim} />
                <Text style={styles.modalEmptyText}>No assignment scores yet</Text>
              </View>
            ) : ranked.map((s: any, i: number) => {
              const scoreColor = s.avgScore >= 70 ? '#5A8A70' : s.avgScore >= 40 ? '#8A8358' : '#B8797E';
              return (
                <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { width: 32, textAlign: 'center', fontWeight: '800', color: i < 3 ? tile.color : colors.textDim, fontSize: 14 }]}>{i + 1}</Text>
                  <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                      <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                    </View>
                    <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12 }]}>{s.submitted}</Text>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                    <View style={[styles.pctPill, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '40' }]}>
                      <Text style={[styles.pctPillText, { color: scoreColor }]}>{s.avgScore}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      );
    }

    case 6: { // Submitted — all students with submission counts, broken down per subject
      const ranked = [...(assignStats as any[])].sort((a: any, b: any) => b.submitted - a.submitted);
      const submittedSubjectCols = [...new Set(ranked.flatMap((s: any) => s.scopedSubjects || []))] as string[];
      const timeById: Record<string, number> = Object.fromEntries(students.map((st: any) => [st.id, st.assignmentTime || 0]));
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{studentsWithSubmissions} Students</Text>
              <Text style={styles.modalHeading}>Assignment Submissions Overview</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 1.4 }]}>Student</Text>
            {submittedSubjectCols.map(subj => (
              <Text key={subj} style={[styles.tableCol, { flex: 1.1, textAlign: 'center' }]}>{subj}</Text>
            ))}
            <Text style={[styles.tableCol, { flex: 0.9, textAlign: 'center' }]}>Total</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Time Spent</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Avg Score</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ranked.map((s: any, i: number) => (
              <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, { flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                    <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                  </View>
                  <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                </View>
                {submittedSubjectCols.map(subj => {
                  const bySubj = (s.bySubject || {})[subj] || { assigned: 0, submitted: 0 };
                  return (
                    <View key={subj} style={[styles.tableCell, { flex: 1.1, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: bySubj.submitted > 0 ? '#5A8A70' : colors.textMain }}>
                        {bySubj.submitted}/{bySubj.assigned}
                      </Text>
                    </View>
                  );
                })}
                {(() => {
                  // Total = sum of the subject columns shown, so it can never contradict
                  // what's visible (raw s.assigned/s.submitted can include untagged legacy
                  // assignments that don't belong to any displayed subject column).
                  const totalAssigned = submittedSubjectCols.reduce((sum, subj) => sum + ((s.bySubject || {})[subj]?.assigned || 0), 0);
                  const totalSubmitted = submittedSubjectCols.reduce((sum, subj) => sum + ((s.bySubject || {})[subj]?.submitted || 0), 0);
                  return (
                    <View style={[styles.tableCell, { flex: 0.9, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: totalSubmitted > 0 ? '#5A8A70' : '#B8797E' }}>
                        {totalSubmitted}/{totalAssigned}
                      </Text>
                    </View>
                  );
                })()}
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12 }]}>
                  {formatStudyTime(timeById[s.id] || 0)}
                </Text>
                <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                  {s.avgScore != null ? (
                    <View style={[styles.pctPill, { backgroundColor: tile.color + '18', borderColor: tile.color + '40' }]}>
                      <Text style={[styles.pctPillText, { color: tile.color }]}>{s.avgScore}%</Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: colors.textDim }}>—</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      );
    }

    default: return null;
  }
}
