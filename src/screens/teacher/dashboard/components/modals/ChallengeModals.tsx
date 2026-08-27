import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatStudyTime } from '../../utils/dashboardHelpers';
import { initials, ModalRenderCtx } from './modalTypes';

// Cases 7-9 of the old renderInsightModalContent switch — Challenge column's
// 3 tiles (Attempted / Completed / Top Scorer). Extracted verbatim.
export function renderChallengeModal(tileIndex: number, ctx: ModalRenderCtx) {
  const { tile, students, challStats, styles, colors, onClose } = ctx;

  switch (tileIndex) {
    case 7: { // Attempted — students with challenges
      const withCh = (challStats as any[]).filter((s: any) => s.assigned > 0);
      const challTimeById: Record<string, number> = Object.fromEntries(students.map((st: any) => [st.id, st.challengeTime || 0]));
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{withCh.length} Students</Text>
              <Text style={styles.modalHeading}>Students with Challenges Assigned</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2 }]}>Student</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Assigned</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Done</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Time Spent</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Avg Score</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {withCh.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Feather name="target" size={28} color={colors.textDim} />
                <Text style={styles.modalEmptyText}>No challenges assigned yet</Text>
              </View>
            ) : withCh.map((s: any, i: number) => (
              <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                    <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                  </View>
                  <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12 }]}>{s.assigned}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: s.completed > 0 ? '#5A8A70' : '#B8797E', fontSize: 12, fontWeight: '700' }]}>{s.completed}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12 }]}>{formatStudyTime(challTimeById[s.id] || 0)}</Text>
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

    case 8: { // Completed — students who finished challenges
      const done = (challStats as any[]).filter((s: any) => s.completed > 0).sort((a: any, b: any) => b.completed - a.completed);
      const challTimeById: Record<string, number> = Object.fromEntries(students.map((st: any) => [st.id, st.challengeTime || 0]));
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>{done.length} Students</Text>
              <Text style={styles.modalHeading}>Challenges Completed</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2 }]}>Student</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Completed</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Time Spent</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Avg Score</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {done.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Feather name="flag" size={28} color={colors.textDim} />
                <Text style={styles.modalEmptyText}>No challenges completed yet</Text>
              </View>
            ) : done.map((s: any, i: number) => (
              <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                    <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                  </View>
                  <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: '#5A8A70', fontSize: 12, fontWeight: '700' }]}>{s.completed}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12 }]}>
                  {formatStudyTime(challTimeById[s.id] || 0)}
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

    case 9: { // Top Scorer — challenge leaderboard
      const ranked = [...(challStats as any[])].filter((s: any) => s.avgScore != null).sort((a: any, b: any) => b.avgScore - a.avgScore);
      return (
        <>
          <View style={styles.modalHeader}>
            <View style={[styles.tileIconWrap, { backgroundColor: tile.color + '25' }]}>
              <Feather name={tile.icon} size={16} color={tile.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalStat, { color: tile.color }]}>Challenge Leaderboard</Text>
              <Text style={styles.modalHeading}>Students Ranked by Challenge Score</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} testID="modal-close-button">
              <Feather name="x" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { width: 32, textAlign: 'center' }]}>#</Text>
            <Text style={[styles.tableCol, { flex: 2 }]}>Student</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'center' }]}>Done</Text>
            <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Avg Score</Text>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {ranked.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Feather name="trending-up" size={28} color={colors.textDim} />
                <Text style={styles.modalEmptyText}>No challenge scores yet</Text>
              </View>
            ) : ranked.map((s: any, i: number) => {
              const medal = i === 0 ? '#C5BD96' : i === 1 ? '#7AADA8' : i === 2 ? '#C4836A' : colors.textDim;
              return (
                <View key={s.id || i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, { width: 32, fontWeight: '800', color: medal, fontSize: 14, textAlign: 'center' }]}>{i + 1}</Text>
                  <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <View style={[styles.modalAvatar, { backgroundColor: tile.color + '20', width: 30, height: 30, borderRadius: 15 }]}>
                      <Text style={[styles.modalAvatarText, { color: tile.color, fontSize: 10 }]}>{initials(s.name || '?')}</Text>
                    </View>
                    <Text style={styles.tableStudentName}>{(s.name || 'Unknown').split(' ')[0]}</Text>
                  </View>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 12 }]}>{s.completed || 0}</Text>
                  <View style={[styles.tableCell, { flex: 1, alignItems: 'flex-end' }]}>
                    <View style={[styles.pctPill, { backgroundColor: tile.color + '18', borderColor: tile.color + '40' }]}>
                      <Text style={[styles.pctPillText, { color: tile.color }]}>{s.avgScore}%</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      );
    }

    default: return null;
  }
}
