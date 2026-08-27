import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LeaderboardEntry } from '../types';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface LeaderboardRankCardProps {
  myEntry: LeaderboardEntry | null;
  aboveEntry: LeaderboardEntry | null;
  loading: boolean;
  colors: AppColors;
}

export default function LeaderboardRankCard({ myEntry, aboveEntry, loading, colors }: LeaderboardRankCardProps) {
  const gold = colors.accentYellow;
  const styles = makeStyles(colors, gold);

  const progressPct = myEntry 
    ? (myEntry.rank === 1 ? 1 : (aboveEntry && aboveEntry.score > 0 ? Math.min(myEntry.score / aboveEntry.score, 1) : 0)) 
    : 0;

  if (myEntry) {
    return (
      <View style={styles.rankCard}>
        <View style={styles.trophyCircle}>
          <Feather name="award" size={44} color={gold} />
        </View>
        <Text style={styles.rankCardTitle}>You&apos;re doing great!</Text>
        <Text style={styles.rankCardSub}>Keep up the momentum and you&apos;ll reach the top soon.</Text>
        <View style={styles.rankCardBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.rankCardBoxLabel}>Your Rank</Text>
            <Text style={[styles.rankCardBoxRank, { color: gold }]}>#{myEntry.rank}</Text>
          </View>
          {myEntry.rank === 1 ? (
            <Text style={[styles.rankCardProgressTxt, { color: gold }]}>Top of the board! 🏆</Text>
          ) : (
            <>
              <Text style={styles.rankCardProgressTxt}>
                {myEntry.score.toLocaleString()} / {aboveEntry?.score.toLocaleString() ?? '—'} XP to reach #{myEntry.rank - 1}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%`, backgroundColor: gold }]} />
              </View>
            </>
          )}
        </View>
        <Text style={styles.rankCardFoot}>Keep learning, keep growing!</Text>
      </View>
    );
  }

  if (!loading) {
    return (
      <View style={styles.rankCard}>
        <View style={styles.trophyCircle}>
          <Feather name="award" size={26} color={colors.textDim} />
        </View>
        <Text style={styles.rankCardTitle}>Not ranked yet</Text>
        <Text style={styles.rankCardSub}>Complete lessons to earn XP and claim your spot on the board!</Text>
      </View>
    );
  }

  return null;
}

const makeStyles = (c: AppColors, gold: string) => StyleSheet.create({
  rankCard: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: 8 },
  trophyCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: c.accentYellow + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  rankCardTitle: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800', color: c.textMain },
  rankCardSub: { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, textAlign: 'center', lineHeight: 18 },
  rankCardBox: { alignSelf: 'stretch', backgroundColor: c.bgDark, borderRadius: radius.lg, padding: spacing.md, gap: 8, marginTop: 8 },
  rankCardBoxLabel: { fontFamily: fonts.serif, fontSize: 12, color: c.textMuted, fontWeight: '600' },
  rankCardBoxRank: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '900' },
  rankCardProgressTxt: { fontFamily: fonts.serif, fontSize: 11, color: c.textDim },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: c.borderColor, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  rankCardFoot: { fontFamily: fonts.serif, fontSize: 11, color: c.textDim, marginTop: 4 },
});
