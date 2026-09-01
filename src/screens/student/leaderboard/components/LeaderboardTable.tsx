import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LeaderboardEntry } from '../types';
import { MEDAL_COLORS } from '../constants';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';
import { FlameIcon } from '../../dashboard/components/common/icons';

function initials(name: string) {
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
}

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  studentId: string | null;
  wide: boolean;
  colors: AppColors;
}

export default function LeaderboardTable({ leaderboard, loading, studentId, wide, colors }: LeaderboardTableProps) {
  const gold = colors.accentYellow;
  const styles = makeStyles(colors, gold);

  return (
    <View style={styles.tableCard}>
      <View style={styles.tableHead}>
        <Text style={styles.thRank}>Rank</Text>
        <Text style={styles.thStudent}>Student</Text>
        {wide && <Text style={styles.thGrade}>Grade</Text>}
        <Text style={styles.thXp}>XP Earned</Text>
        <Text style={styles.thStreak}>Streak</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator color={gold} style={{ paddingVertical: 40 }} />
      ) : leaderboard.length === 0 ? (
        <Text style={styles.empty}>No rankings in this view yet.</Text>
      ) : leaderboard.map((s, i) => {
        const medalColor = MEDAL_COLORS[s.rank - 1];
        const isMe = s.id === studentId;
        return (
          <View key={s.id} style={[styles.tr, i < leaderboard.length - 1 && styles.trBorder, isMe && { backgroundColor: gold + '0E' }]}>
            <View style={styles.thRank}>
              <View style={[styles.rankBadge, { backgroundColor: medalColor ? medalColor + '26' : 'transparent' }]}>
                {s.rank <= 3 ? <Feather name="award" size={13} color={medalColor} /> : <Text style={[styles.rankNum, { color: colors.textMuted }]}>{s.rank}</Text>}
              </View>
            </View>
            <View style={[styles.thStudent, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }]}>
              <View style={[styles.avatar, { backgroundColor: isMe ? gold + '25' : colors.accentYellow + '20' }]}>
                <Text style={[styles.avatarText, { color: isMe ? gold : colors.accentYellow }]}>{initials(s.name)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                  {isMe && (<View style={[styles.youBadge, { backgroundColor: gold + '20', borderColor: gold + '40' }]}><Text style={[styles.youText, { color: gold }]}>You</Text></View>)}
                </View>
                {!wide && <Text style={styles.gradeSmall}>{s.grade}</Text>}
              </View>
            </View>
            {wide && <Text style={styles.thGrade}><Text style={styles.gradeCell}>{s.grade}</Text></Text>}
            <View style={styles.thXp}><Text style={[styles.xpCell, { color: gold }]}>{s.score.toLocaleString()} <Text style={{ fontSize: 11, fontWeight: '600' }}>XP</Text></Text></View>
            <View style={[styles.thStreak, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }]}>
              {/* Bug #23 ("symbol error"): this was Feather's "wind" icon —
                  wrong symbol for a streak. Every other streak display in
                  the app (e.g. Dashboard's HeroCard) uses this same flame
                  icon; Feather has no flame glyph, which is presumably how
                  "wind" ended up here in the first place. */}
              <FlameIcon size={12} />
              <Text style={styles.streakCell}>{s.streak}d</Text>
            </View>
          </View>
        );
      })}
      
      {leaderboard.length > 6 && (
        <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.8} onPress={() => {}}>
          <Text style={[styles.viewAllText, { color: gold }]}>View Full Leaderboard</Text>
          <Feather name="arrow-right" size={14} color={gold} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = (c: AppColors, gold: string) => StyleSheet.create({
  tableCard: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, overflow: 'hidden' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: c.borderColor, backgroundColor: c.bgDark + '80' },
  thRank: { width: 54, fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  thStudent: { flex: 1, fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  thGrade: { width: 90, fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  thXp: { width: 96, fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  thStreak: { width: 72, fontFamily: fonts.serif, fontSize: 11, fontWeight: '700', color: c.textDim, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: spacing.lg },
  trBorder: { borderBottomWidth: 1, borderBottomColor: c.borderColor },
  rankBadge: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700' },
  name: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', color: c.textMain, flexShrink: 1, textTransform: 'none' },
  gradeSmall: { fontFamily: fonts.serif, fontSize: 11, color: c.textDim, marginTop: 1, textTransform: 'none' },
  gradeCell: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, fontWeight: '600', textTransform: 'none' },
  xpCell: { fontFamily: fonts.serif, fontSize: 15, fontWeight: '800', letterSpacing: -0.3, textTransform: 'none' },
  streakCell: { fontFamily: fonts.serif, fontSize: 13, color: c.textMuted, fontWeight: '700', textTransform: 'none' },
  youBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  youText: { fontFamily: fonts.serif, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  empty: { textAlign: 'center', color: c.textMuted, padding: spacing.xl, fontFamily: fonts.serif, fontSize: 13 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.borderColor },
  viewAllText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700' },
});
