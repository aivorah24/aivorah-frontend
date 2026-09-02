import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline, Circle } from 'react-native-svg';
import type { AppColors } from '../../../../theme';
import type { LeaderEntry } from '../services/teacherChallengesService';
import type { makeStyles } from '../styles';

const GOLD = '#D9A93E';
const MEDAL_COLORS = ['#f59e0b', '#94a3b8', '#cd7c2c'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function StatCard({ icon, tint, value, label, styles }: {
  icon: any; tint: string; value: string; label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint + '22' }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

export function PodiumCard({ entry, place, colors, styles, isDark, elevated }: {
  entry: LeaderEntry; place: number; colors: AppColors;
  styles: ReturnType<typeof makeStyles>; isDark: boolean; elevated?: boolean;
}) {
  const medal = MEDAL_COLORS[place - 1];
  const body = (
    <>
      <View style={[styles.podiumBadge, { backgroundColor: medal, borderColor: colors.cardDark }]}>
        <Text style={styles.podiumBadgeNum}>{place}</Text>
      </View>
      <View style={[styles.podiumAvatar, { backgroundColor: GOLD + '22', borderColor: medal }]}>
        <Text style={[styles.podiumInitials, { color: GOLD }]}>{initials(entry.name)}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{entry.name}</Text>
      <Text style={styles.podiumGrade}>{entry.grade}</Text>
      <Text style={[styles.podiumXP, elevated && { color: medal, fontSize: 22 }]}>
        {entry.score.toLocaleString()} <Text style={styles.podiumXPUnit}>XP</Text>
      </Text>
    </>
  );
  if (elevated) {
    return (
      <LinearGradient
        colors={[medal + (isDark ? '33' : '22'), isDark ? colors.cardDark : '#FFFFFF']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[styles.podiumCard, styles.podiumCardTop, { borderColor: medal + '99' }]}
      >
        {body}
      </LinearGradient>
    );
  }
  const surface = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)';
  return <View style={[styles.podiumCard, { backgroundColor: surface, borderColor: colors.borderColor }]}>{body}</View>;
}

export function WeeklyChart({ data, styles }: {
  data: number[]; styles: ReturnType<typeof makeStyles>;
}) {
  const W = 280, H = 96, pad = 10;
  const max = Math.max(...data, 1);
  const n = data.length;
  const stepX = n > 1 ? (W - pad * 2) / (n - 1) : 0;
  const ptY = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const points = data.map((v, i) => `${pad + i * stepX},${ptY(v)}`).join(' ');
  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Polyline points={points} fill="none" stroke={GOLD} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((v, i) => <Circle key={i} cx={pad + i * stepX} cy={ptY(v)} r={3} fill={GOLD} />)}
      </Svg>
      <View style={styles.weekLabels}>
        {WEEK_DAYS.map(d => <Text key={d} style={styles.weekLabel}>{d}</Text>)}
      </View>
    </View>
  );
}
