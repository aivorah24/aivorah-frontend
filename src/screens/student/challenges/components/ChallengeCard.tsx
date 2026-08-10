import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import SERVER_URL from '../../../../config/serverUrl';
import type { Challenge } from '../types';
import { DIFF_COLORS } from '../constants';

interface Props {
  ch: Challenge;
  onStart: (ch: Challenge) => void;
  styles: any;
  colors: AppColors;
}

function rankBadgeConfig(score: number) {
  if (score >= 80)      return { label: 'Top 1%',  emoji: '🥇', bg: '#fbbf24', border: '#f59e0b', text: '#78350f' };
  if (score >= 60)      return { label: 'Top 5%',  emoji: '🥈', bg: '#D8CFA8', border: '#BAA467', text: '#4A4228' };
  if (score >= 40)      return { label: 'Top 10%', emoji: '🥉', bg: '#C5BD96', border: '#9A7B2E', text: '#3A3520' };
  if (score >= 20)      return { label: 'Top 25%', emoji: '⭐', bg: '#C8DCCC', border: '#9FB2A4', text: '#2A3530' };
  return null;
}

export default function ChallengeCard({ ch, onStart, styles, colors }: Props) {
  const diffColor = DIFF_COLORS[ch.difficulty] ?? colors.accentYellow;
  const rawImg = (ch as any).thumbnailUrl ?? ch.imageUrl ?? null;
  const imgUrl = rawImg ? (rawImg.startsWith('http') ? rawImg : `${SERVER_URL}${rawImg}`) : null;
  const rankCfg = ch.status === 'completed' && ch.score != null ? rankBadgeConfig(ch.score) : null;
  const isGold = ch.score != null && ch.score >= 95;

  return (
    <View style={styles.challengeCard}>
      {/* Full-height image with title + badges overlaid */}
      <View style={styles.cardImageWrap}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: diffColor + '33' }]} />
        )}
        <View style={styles.cardScrim} />
        {/* Difficulty pill — top right */}
        <View style={[styles.diffPill, { backgroundColor: diffColor }]}>
          <Text style={styles.diffPillText}>{ch.difficulty}</Text>
        </View>
        {/* Ranking band badge — top left, only for completed */}
        {rankCfg && (
          <View style={[styles.rankBadgeWrap, {
            backgroundColor: isGold ? '#fbbf24' : rankCfg.bg,
            borderColor: rankCfg.border,
            shadowColor: rankCfg.border,
          }]}>
            {isGold && <View style={styles.rankBadgeShine} />}
            <Text style={styles.rankBadgeEmoji}>{rankCfg.emoji}</Text>
            <View>
              <Text style={[styles.rankBadgeLabel, { color: isGold ? '#78350f' : '#fff' }]}>{rankCfg.label}</Text>
              <Text style={[styles.rankBadgeSub, { color: isGold ? '#92400e' : 'rgba(255,255,255,0.8)' }]}>Performer</Text>
            </View>
          </View>
        )}
        {/* Title + XP overlaid at bottom of image */}
        <View style={styles.cardOverlay}>
          <Text style={styles.cardOverlayTitle} numberOfLines={1}>{ch.title}</Text>
          <View style={styles.cardOverlayMeta}>
            <Feather name="star" size={11} color={colors.accentYellow} />
            <Text style={styles.cardOverlayXP}>{ch.xpReward} XP</Text>
            <Text style={styles.cardOverlayDot}>·</Text>
            <Feather name="clock" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardOverlayTime}>{ch.timeLimitMinutes} min</Text>
          </View>
        </View>
      </View>

      {/* Action row */}
      {ch.status === 'completed' ? (
        <View style={styles.completedRow}>
          <Feather name="check-circle" size={13} color={colors.accentGreen} />
          <Text style={[styles.completedText, { color: colors.accentGreen }]}>{ch.score}% · +{ch.xpAwarded} XP</Text>
        </View>
      ) : (ch as any).closed ? (
        <View style={[styles.completedRow, { opacity: 0.7 }]}>
          <Feather name="lock" size={13} color={colors.textDim} />
          <Text style={[styles.completedText, { color: colors.textDim }]}>Closed</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: ch.status === 'assigned' ? colors.accentGreen : colors.accentYellow }]}
          onPress={() => onStart(ch)}
          activeOpacity={0.85}
        >
          <Feather name="play" size={13} color="white" />
          <Text style={styles.startBtnText}>
            {ch.status === 'assigned' ? 'Start Now' : 'Start Challenge'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
