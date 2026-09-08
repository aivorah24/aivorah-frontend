import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import { subjectMeta } from '../constants';
import type { ChildReport } from '../types';

export default function SubjectCard({
  sub, completedSet, isExpanded, onToggle, width,
}: {
  sub: any;
  completedSet: Set<string>;
  analyticsReport?: ChildReport | null;
  isExpanded: boolean;
  onToggle: () => void;
  width?: `${number}%` | number;
}) {
  const meta    = subjectMeta(sub.subject);
  const accent  = meta.accentDark;
  const topics: any[] = sub.topics ?? [];
  const done    = topics.filter((t: any) => {
    const name = typeof t === 'string' ? t : t.topic;
    return completedSet.has(name) || [...completedSet].some(c => c.includes(name));
  }).length;
  const pct     = sub.topicCount > 0 ? Math.round((done / sub.topicCount) * 100) : 0;
  const chapterCount = sub.chapterCount ?? 0;
  const unitCount    = sub.unitCount ?? new Set(topics.map((t: any) => (typeof t === 'string' ? '' : t.unit)).filter(Boolean)).size;
  const countLabel =
    chapterCount > 0 ? `${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}`
    : unitCount > 0  ? `${unitCount} ${unitCount === 1 ? 'unit' : 'units'}`
    : sub.topicCount > 0 && sub.topicCount <= 40 ? `${sub.topicCount} topics`
    : '';

  return (
    <View style={[styles.wrapper, width ? { width } : undefined, isExpanded && { borderWidth: 2, borderColor: accent }]}>
      <LinearGradient
        colors={[meta.bgFromDark, meta.bgToDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <TouchableOpacity onPress={onToggle} activeOpacity={0.85} style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: '#ffffff50' }]}>
            <Feather name={meta.icon as any} size={18} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subjectName}>{sub.subject}</Text>
            <Text style={styles.subjectMeta}>{countLabel ? `${countLabel} · ` : ''}{done} completed</Text>
          </View>
          <View style={styles.rightCol}>
            <View style={[styles.pctPill, { borderColor: accent + '88', backgroundColor: '#ffffff50' }]}>
              <Text style={[styles.pctText, { color: accent }]}>{pct}%</Text>
            </View>
            <Feather name={isExpanded ? 'chevron-up' : 'chevron-right'} size={16} color={accent} style={{ marginTop: 4 }} />
          </View>
        </TouchableOpacity>

        <View style={[styles.track, { backgroundColor: accent + '40' }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
        </View>
      </LinearGradient>
    </View>
  );
}

export const cardStyles = StyleSheet.create({
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pctPill:  { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pctText:  { fontFamily: fonts.serif, fontSize: 11, fontWeight: '800' },
});

const styles = StyleSheet.create({
  wrapper:     { borderRadius: 16, overflow: 'hidden' },
  gradient:    { borderRadius: 16 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  subjectName: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '800', color: '#1C2A28' },
  subjectMeta: { fontFamily: fonts.serif, fontSize: 11, fontWeight: '600', color: '#3A5A56', marginTop: 2 },
  rightCol:    { alignItems: 'center', gap: 2 },
  pctPill:     { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pctText:     { fontFamily: fonts.serif, fontSize: 11, fontWeight: '800' },
  track:       { marginHorizontal: 14, marginBottom: 14, height: 5, borderRadius: 999, overflow: 'hidden' },
  fill:        { height: '100%', borderRadius: 999 },
});
