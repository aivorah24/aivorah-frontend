import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LeaderboardEntry } from '../types';
import { MEDAL_COLORS } from '../constants';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

function initials(name: string) {
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();
}

interface LeaderboardPodiumProps {
  podium: (LeaderboardEntry | null)[];
  studentId: string | null;
  colors: AppColors;
}

export default function LeaderboardPodium({ podium, studentId, colors }: LeaderboardPodiumProps) {
  const gold = colors.accentYellow;
  const styles = makeStyles(colors, gold);

  return (
    <View style={styles.podiumRow}>
      {podium.map((s, idx) => {
        if (!s) return <View key={`empty-${idx}`} style={{ flex: 1 }} />;
        const isFirst = idx === 1;
        const isMe = s.id === studentId;
        const medalColor = MEDAL_COLORS[s.rank - 1];
        const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
        
        return (
          <View key={s.id} style={[
            styles.podiumCard,
            isFirst && { borderColor: gold, backgroundColor: gold + '12', transform: [{ translateY: -8 }] },
            isMe && !isFirst && { borderColor: gold + '66' },
          ]}>
            <View style={[styles.medalBadge, { backgroundColor: medalColor }]}>
              <Text style={styles.medalNum}>{actualRank}</Text>
            </View>
            <View style={[styles.podiumAvatar, { borderColor: isFirst ? gold : colors.borderColor }]}>
              <Text style={[styles.podiumAvatarText, { color: isFirst ? gold : colors.accentYellow }]}>
                {initials(s.name)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.podiumName} numberOfLines={1}>{s.name}</Text>
              <Text style={[styles.podiumScore, { color: gold }]}>
                {s.score.toLocaleString()} <Text style={{ fontSize: 10, fontWeight: '600' }}>XP</Text>
              </Text>
            </View>
            <Feather name="award" size={20} color={medalColor} />
            {isMe && (
              <View style={[styles.youBadge, { position: 'absolute', top: 6, right: 6, backgroundColor: gold + '20', borderColor: gold + '40' }]}>
                <Text style={[styles.youText, { color: gold }]}>You</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: AppColors, gold: string) => StyleSheet.create({
  podiumRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md, paddingTop: 10 },
  podiumCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.md },
  medalBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  medalNum: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '900', color: '#0B0B0B' },
  podiumAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, backgroundColor: c.accentYellow + '18', alignItems: 'center', justifyContent: 'center' },
  podiumAvatarText: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  podiumName: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700', color: c.textMain },
  podiumScore: { fontFamily: fonts.serif, fontSize: 12, fontWeight: '700', marginTop: 1 },
  youBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  youText: { fontFamily: fonts.serif, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});
