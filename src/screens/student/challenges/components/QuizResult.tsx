import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  quizResult: { score: number; xpAwarded: number };
  leaderboard: any[];
  leaderLoading: boolean;
  studentId: string | undefined;
  grade: string;
  onDone: () => void;
  styles: any;
  colors: AppColors;
}

function scoreBand(s: number) {
  if (s === 100)    return { label: 'Perfect!',  emoji: '🌟', bg: '#bbf7d0', border: '#4ade80', labelColor: '#14532d', sub: 'Incredible! A flawless perfect score!' };
  if (s >= 80)      return { label: 'Top 1%',   emoji: '🥇', bg: '#bbf7d0', border: '#4ade80', labelColor: '#14532d', sub: 'Exceptional! You are among the best!' };
  if (s >= 60)      return { label: 'Top 5%',   emoji: '🥈', bg: '#E6DEBC', border: '#BAA467', labelColor: '#4A4228', sub: 'Outstanding result! Keep it up!' };
  if (s >= 40)      return { label: 'Top 10%',  emoji: '🥉', bg: '#E0D8B8', border: '#9A7B2E', labelColor: '#3A3520', sub: 'Great performance! Well done!' };
  if (s >= 20)      return { label: 'Top 25%',  emoji: '⭐', bg: '#D8E4DC', border: '#9FB2A4', labelColor: '#2A3530', sub: 'Good effort! Keep practising!' };
  return null;
}

function rankBand(myRank: number, totalStudents: number) {
  if (!myRank || totalStudents <= 0) return null;
  const pct = (myRank / totalStudents) * 100;
  if (pct <= 3)       return { label: 'Top 3%',  color: '#C9A24E', icon: 'award' as const };
  if (pct <= 5)  return { label: 'Top 5%',  color: '#BAA467', icon: 'trending-up' as const };
  if (pct <= 10) return { label: 'Top 10%', color: '#9A7B2E', icon: 'trending-up' as const };
  if (pct <= 25) return { label: 'Top 25%', color: '#9FB2A4', icon: 'trending-up' as const };
  return null;
}

export default function QuizResult({ quizResult, leaderboard, leaderLoading, studentId, grade, onDone, styles, colors }: Props) {
  const s = quizResult.score;
  const circleColor = s === 100 ? '#4ade80' : s >= 70 ? colors.accentGreen : colors.accentYellow;
  const band = scoreBand(s);

  const myEntry = leaderboard.find(e => e.id === studentId);
  const myRank = myEntry?.rank ?? null;
  const totalStudents = myEntry?.totalStudents ?? leaderboard.length;
  const top3 = leaderboard.slice(0, 3);
  const MEDAL = ['#f59e0b', '#94a3b8', '#cd7c2c'];
  const rb = rankBand(myRank, totalStudents);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultBox}>
      {/* Score circle */}
      <View style={[styles.resultCircle, { borderColor: circleColor }]}>
        <Text style={[styles.resultScore, { color: circleColor }]}>{s}%</Text>
        <Text style={styles.resultLabel}>Score</Text>
      </View>
      <Text style={styles.resultTitle}>
        {s === 100 ? 'Perfect Score!' : s >= 80 ? 'Outstanding!' : s >= 60 ? 'Well done!' : 'Good effort!'}
      </Text>

      {/* Score-based ranking band — shown immediately */}
      {band && (
        <View style={[styles.scoreBandBanner, { backgroundColor: band.bg, borderColor: band.border }]}>
          <Text style={{ fontSize: 24 }}>{band.emoji}</Text>
          <View>
            <Text style={[styles.scoreBandLabel, { color: band.labelColor }]}>{band.label} Performer</Text>
            <Text style={[styles.scoreBandSub, { color: band.labelColor, opacity: 0.75 }]}>{band.sub}</Text>
          </View>
        </View>
      )}

      <View style={styles.xpEarned}>
        <Feather name="star" size={18} color={colors.accentYellow} />
        <Text style={[styles.xpEarnedText, { color: colors.accentYellow }]}>+{quizResult.xpAwarded} XP earned</Text>
      </View>

      {/* Challenge Leaderboard */}
      <View style={styles.lbSection}>
        <View style={styles.lbHeader}>
          <Feather name="award" size={14} color={colors.accentYellow} />
          <Text style={styles.lbTitle}>Challenge Rankings</Text>
          <View style={styles.liveBadge2}>
            <View style={[styles.liveDot2, { backgroundColor: colors.accentGreen }]} />
            <Text style={[styles.liveText2, { color: colors.accentGreen }]}>LIVE</Text>
          </View>
        </View>

        {leaderLoading ? (
          <ActivityIndicator color={colors.accentYellow} style={{ marginVertical: 16 }} />
        ) : leaderboard.length === 0 ? (
          <Text style={styles.lbEmpty}>Be the first to top the leaderboard!</Text>
        ) : (
          <>
            {/* Rank band — prominent banner */}
            {rb && (
              <View style={[styles.rankBandBanner, { backgroundColor: rb.color + '18', borderColor: rb.color + '55' }]}>
                <Feather name={rb.icon} size={22} color={rb.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankBandLabel, { color: rb.color }]}>{rb.label} in {grade}!</Text>
                  <Text style={[styles.rankBandSub, { color: colors.textMuted }]}>Ranked #{myRank} out of {totalStudents} students</Text>
                </View>
              </View>
            )}
            {!rb && myRank && (
              <View style={[styles.myRankBanner, { borderColor: colors.accentYellow + '40', backgroundColor: colors.accentYellow + '0C' }]}>
                <Feather name="trending-up" size={16} color={colors.accentYellow} />
                <Text style={[styles.myRankText, { color: colors.accentYellow }]}>You are ranked #{myRank} out of {totalStudents}</Text>
              </View>
            )}

            {/* Top 3 leaderboard rows */}
            {top3.map((entry, i) => {
              const isMe = entry.id === studentId;
              return (
                <View key={entry.id} style={[styles.lbRow, isMe && { backgroundColor: colors.accentYellow + '0C' }]}>
                  <View style={[styles.lbMedal, { backgroundColor: MEDAL[i] + '22' }]}>
                    <Feather name="award" size={12} color={MEDAL[i]} />
                  </View>
                  <View style={[styles.lbAvatar, { backgroundColor: isMe ? colors.accentYellow + '30' : colors.borderColor }]}>
                    <Text style={[styles.lbAvatarText, { color: isMe ? colors.accentYellow : colors.textMuted }]}>
                      {entry.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.lbName, isMe && { color: colors.accentYellow }]}>{entry.name.split(' ')[0]}</Text>
                      {isMe && <View style={styles.youChip}><Text style={[styles.youChipText, { color: colors.accentYellow }]}>You</Text></View>}
                    </View>
                    <Text style={styles.lbMeta}>{entry.count} challenge{entry.count !== 1 ? 's' : ''} · avg {entry.avgScore}%</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.lbXP, { color: colors.accentYellow }]}>{entry.xp}</Text>
                    <Text style={styles.lbXPLabel}>XP</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>

      <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
