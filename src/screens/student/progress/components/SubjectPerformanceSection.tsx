import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SubjectStat } from '../types';

export function SubjectPerformanceSection({ styles, subjectStats, navigation }: {
  styles: any;
  subjectStats: SubjectStat[];
  navigation: any;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Subject Performance</Text>
      {subjectStats.length === 0 ? (
        <Text style={styles.emptyText}>Complete lessons to see subject scores.</Text>
      ) : (
        <View style={styles.subjectsGrid}>
          {subjectStats.map((s) => (
            <TouchableOpacity
              key={s.name}
              style={styles.subjectCard}
              onPress={() => navigation.navigate('LearningPaths')}
              activeOpacity={0.8}
            >
              <View style={[styles.subjectIcon, { backgroundColor: s.color + '18' }]}>
                <Feather name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={styles.subjectName}>{s.name}</Text>
              {/* Pinned to the card bottom so scores line up when names wrap. */}
              <View style={styles.subjectStats}>
                <Text style={[styles.subjectScore, { color: s.color }]}>{s.pct}%</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${s.pct}%` as any, backgroundColor: s.color }]} />
                </View>
                <Text style={styles.subjectMeta}>{s.done} / {s.total} chapters</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}
