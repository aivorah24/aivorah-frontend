import React from 'react';
import { StyleSheet } from 'react-native';
import { fonts } from '../../../../theme';
import StudentSubjectCard from '../../../student/learning-paths/components/SubjectCard';
import type { SubjectData } from '../../../student/learning-paths/types';
import type { ChildReport } from '../types';

// Same card the student sees on Learning Paths; tapping opens the details panel instead of navigating.
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
  const topics = (sub.topics ?? []).map((t: any) => (typeof t === 'string' ? { topic: t, unit: '', description: '' } : t));
  const data: SubjectData = { ...sub, topics, topicCount: topics.length || sub.topicCount || 0 };
  return (
    <StudentSubjectCard
      data={data}
      completedSet={completedSet}
      onPress={onToggle}
      width={width ?? '100%'}
      selected={isExpanded}
    />
  );
}

export const cardStyles = StyleSheet.create({
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pctPill:  { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  pctText:  { fontFamily: fonts.serif, fontSize: 11, fontWeight: '800' },
});
