import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatStudyTime } from '../../utils/dashboardHelpers';
import { initials, ModalRenderCtx } from './modalTypes';

// Cases 0-3 of the old renderInsightModalContent switch — Learning Path
// column's 4 tiles (Struggling / Top Performers / Inactive / Study Time).
// Extracted verbatim; only the dispatch mechanism changed.
export function renderLearningPathModal(tileIndex: number, ctx: ModalRenderCtx) {
  const { tile, students, allNeedsAttention, totalStudyMins, styles, colors, onClose } = ctx;

  switch (tileIndex) {
    case 0: { // Struggling — same population as the outer tile (needsAttention)
      const stuck = [...allNeedsAttention]
        .sort((a, b) => (a.progressPct || 0) - (b.progressPct || 0));
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{stuck.length} Students</Text>
              <Text style={styles.modalHeading}>Need Support</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2.4 }]}>Student</Text>
            <Text style={[styles.tableCol, { flex: 1.3 }]}>Topics Done</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Streak</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Progress</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {stuck.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Feather name="check-circle" size={28} color="#5A8A70" />
                <Text style={styles.modalEmptyText}>No students need support right now!</Text>
              </View>
            ) : stuck.map((s, i) => {
              // "Topics Done" must only count the teacher's own subjects (Mathematics,
              // English) — other subjects (PE, Art, ...) are handled by other staff and
              // shouldn't inflate this count. Falls back to the raw count only when this
              // teacher has no subject scoping configured at all.
              const scopedSubjectsForCount: string[] = s.scopedSubjects || [];
              const doneCount = scopedSubjectsForCount.length > 0
                ? (s.completedTopicsDetailed || []).filter((d: any) => scopedSubjectsForCount.includes(d.subject)).length
                : (s.completedTopics || []).length;
              const pct = s.progressPct || 0;
              const pctColor = pct < 20 ? '#B8797E' : '#8A8358';
              const streak = s.currentStreak || 0;
              return (
                <View key={s.id || String(i)} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <View style={[styles.tableCell, { flex: 2.4, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                      <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                    </View>
                    <View>
                      <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                      <Text style={styles.tableStudentGrade}>{s.grade || '—'}</Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 1.3, alignItems: 'flex-start' }]}>
                    <Text style={[styles.tableChip, doneCount === 0
                      ? { color: '#B8797E', borderColor: '#B8797E40', backgroundColor: '#B8797E10' }
                      : { color: '#5A8A70', borderColor: '#5A8A7040', backgroundColor: '#5A8A7010' }
                    ]}>
                      {doneCount === 0 ? 'None yet' : doneCount + ' topics done'}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: streak === 0 ? '#B8797E' : colors.textDim, fontSize: 12, fontWeight: '700' }]}>
                    {streak}d
                  </Text>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                    <View style={[styles.pctPill, { backgroundColor: pctColor + '18', borderColor: pctColor + '40' }]}>
                      <Text style={[styles.pctPillText, { color: pctColor }]}>{pct}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      );
    }

    case 1: { // Top Performers — leaderboard table
      const ranked = [...students].sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0));
      // One column per subject this teacher is scoped to (e.g. Mathematics, English),
      // each showing Today + Total separately — clearer for real per-subject analysis
      // than cramming both subjects' numbers as sub-text under one combined column.
      const subjectColumns = [...new Set(ranked.flatMap((s: any) => s.scopedSubjects || []))] as string[];
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>Leaderboard</Text>
              <Text style={styles.modalHeading}>All Students Ranked by Progress</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          {/* Learning Path only, scoped to the subject(s) this teacher handles */}
          <View style={styles.tableHeader}>
            <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.tableCol}>#</Text>
            </View>
            <View style={{ flex: 2, justifyContent: 'center' }}>
              <Text style={styles.tableCol}>Student</Text>
            </View>
            <View style={{ flex: 2, justifyContent: 'center' }}>
              <Text style={styles.tableCol}>Topics (by subject)</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.tableCol}>Streak</Text>
            </View>
            {subjectColumns.length > 0 ? (
              subjectColumns.map(subj => (
                <View key={subj} style={{ flex: 1.2, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={styles.tableCol}>{subj}</Text>
                </View>
              ))
            ) : (
              <>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={styles.tableCol}>Today</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={styles.tableCol}>Total</Text>
                </View>
              </>
            )}
            <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={styles.tableCol}>Progress</Text>
            </View>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ranked.map((s, i) => {
              const medal = i === 0 ? '#C5BD96' : i === 1 ? '#7AADA8' : i === 2 ? '#C4836A' : colors.textDim;
              // Group this student's completed topics by subject, e.g. "Mathematics: 2, English: 1".
              // Always show every subject this teacher is scoped to (even at 0 done) so
              // monitoring is complete at a glance, not just whichever subjects happen to
              // have a completion — that's the whole point of per-subject tracking.
              const bySubject: Record<string, number> = {};
              (s.scopedSubjects || []).forEach((subj: string) => { bySubject[subj] = 0; });
              (s.completedTopicsDetailed || []).forEach((d: any) => {
                if (d.subject) bySubject[d.subject] = (bySubject[d.subject] || 0) + 1;
              });
              const subjectEntries = Object.entries(bySubject);
              // "N done" must match the sum of the scoped-subject breakdown below it —
              // not the raw completedTopics count, which also includes topics from
              // subjects outside this teacher's scope (e.g. Physical Education).
              const scopedDoneCount = subjectEntries.length > 0
                ? subjectEntries.reduce((sum, [, count]) => sum + count, 0)
                : (s.completedTopics || []).length;
              return (
                <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[styles.tableCell, { fontWeight: '800', color: medal, fontSize: 14 }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                      <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name)}</Text>
                    </View>
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={styles.tableStudentName}>{s.name.split(' ')[0]}</Text>
                      <Text style={styles.tableStudentGrade}>{s.grade}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 2, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain }}>{scopedDoneCount} done</Text>
                    {subjectEntries.length > 0 && (
                      <Text style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }} numberOfLines={2}>
                        {subjectEntries.map(([subj, count]) => `${subj}: ${count}`).join('  ·  ')}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[styles.tableCell, { color: colors.textMuted, fontSize: 12 }]}>{s.currentStreak || 0}d</Text>
                  </View>
                  {subjectColumns.length > 0 ? (
                    subjectColumns.map(subj => {
                      const todayMins = (s.subjectTimeToday || {})[subj] || 0;
                      const totalMins = (s.subjectTime || {})[subj] || 0;
                      return (
                        <View key={subj} style={{ flex: 1.2, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
                            {formatStudyTime(todayMins)}
                          </Text>
                          {totalMins > 0 && (
                            <Text style={{ fontSize: 9, color: colors.textDim, marginTop: 1, textAlign: 'center' }}>
                              of {formatStudyTime(totalMins)} total
                            </Text>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <>
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={[styles.tableCell, { color: colors.textMuted, fontSize: 12 }]}>{formatStudyTime(s.learningPathTimeToday || 0)}</Text>
                      </View>
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={[styles.tableCell, { color: colors.textMuted, fontSize: 12 }]}>{formatStudyTime(s.learningPathTime || 0)}</Text>
                      </View>
                    </>
                  )}
                  <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                    <View style={[styles.pctPill, { backgroundColor: tile.color + '18', borderColor: tile.color + '40' }]}>
                      <Text style={[styles.pctPillText, { color: tile.color }]}>{s.progressPct || 0}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      );
    }

    case 2: { // Inactive
      const inactive = students
        .filter(s => { const d = s.lastActive ? Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 86400000) : 999; return d >= 3; })
        .sort((a, b) => (a.lastActive || '').localeCompare(b.lastActive || ''));
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{inactive.length} Students</Text>
              <Text style={styles.modalHeading}>Inactive for 3+ Days</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2 }]}>Student</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Last Seen</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Topics</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Progress</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {inactive.map((s, i) => {
              const days = s.lastActive ? Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 86400000) : 999;
              const urgency = days > 7 ? '#B8797E' : tile.color;
              return (
                <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <View style={[styles.modalAvatar, { backgroundColor: urgency + '20', width: 30, height: 30, borderRadius: 15 }]}>
                      <Text style={[styles.modalAvatarText, { color: urgency, fontSize: 10 }]}>{initials(s.name)}</Text>
                    </View>
                    <View>
                      <Text style={styles.tableStudentName}>{s.name.split(' ')[0]}</Text>
                      <Text style={styles.tableStudentGrade}>{s.grade}</Text>
                    </View>
                  </View>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'center' }]}>
                    <Text style={[styles.tableChip, { alignSelf: 'center', color: urgency, borderColor: urgency + '40', backgroundColor: urgency + '10' }]}>
                      {days === 999 ? 'Never' : `${days}d ago`}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12 }]}>{(s.completedTopics || []).length} done</Text>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                    <View style={[styles.pctPill, { backgroundColor: urgency + '18', borderColor: urgency + '40' }]}>
                      <Text style={[styles.pctPillText, { color: urgency }]}>{s.progressPct || 0}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      );
    }

    case 3: { // Study Time — per-student breakdown (Learning Path only)
      const ranked = [...students].sort((a, b) => (b.learningPathTime || 0) - (a.learningPathTime || 0));
      const maxMins = Math.max(...ranked.map(s => s.learningPathTime || 0), 1);
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{formatStudyTime(totalStudyMins)}</Text>
              <Text style={styles.modalHeading}>Total Study Time Across Class</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2 }]}>Student</Text>
            <Text style={[styles.tableCol, { flex: 2 }]}>Time</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Progress</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ranked.map((s, i) => (
              <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                    <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                  </View>
                  <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                </View>
                <View style={[styles.tableCell, { flex: 2, gap: 3 }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMain }}>{formatStudyTime(s.learningPathTime || 0)}</Text>
                  <View style={[styles.progressTrack, { backgroundColor: colors.borderColor }]}>
                    <View style={[styles.progressFill, { width: `${Math.round(((s.learningPathTime || 0) / maxMins) * 100)}%` as any, backgroundColor: tile.color }]} />
                  </View>
                </View>
                <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                  <View style={[styles.pctPill, { backgroundColor: tile.color + '18', borderColor: tile.color + '40' }]}>
                    <Text style={[styles.pctPillText, { color: tile.color }]}>{s.progressPct || 0}%</Text>
                  </View>
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
