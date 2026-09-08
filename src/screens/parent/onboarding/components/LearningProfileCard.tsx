import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CardHeader } from '../../../onboarding/OnboardingSharedFields';
import { CURRICULA, getGradesForCurriculum } from '../../../onboarding/OnboardingScreen';
import type { ChildEntry } from '../types';

const GRADE_GROUPS = [
  { label: 'Early Years', grades: ['Nursery', 'LKG', 'UKG'] },
  { label: 'Primary', grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
  { label: 'Middle School', grades: ['Grade 6', 'Grade 7', 'Grade 8'] },
  { label: 'Senior School', grades: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] },
];

export function LearningProfileCard({
  styles, done,
  childrenList, activeChildIdx, activeChild, selectChild, updateChild,
}: {
  styles: any; done: boolean;
  childrenList: ChildEntry[]; activeChildIdx: number; activeChild: ChildEntry;
  selectChild: (idx: number) => void;
  updateChild: (field: keyof ChildEntry, value: string) => void;
}) {
  return (
    <View style={[styles.card, styles.cardFull]}>
      <CardHeader icon="book-open" title="3. Child's Learning Profile" subtitle="What is your child learning?" done={done} styles={styles} />

      {childrenList.length > 1 && (
        <View style={styles.chipRow}>
          {childrenList.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, activeChildIdx === i && styles.chipActive]}
              onPress={() => selectChild(i)}
              activeOpacity={0.8}>
              <Text style={[styles.chipTxt, activeChildIdx === i && styles.chipTxtActive]}>
                {c.name.trim() || `Child ${i + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.lbl}>Child&apos;s Curriculum</Text>
        <View style={styles.fieldBox}>
          <View style={styles.chipRow}>
            {CURRICULA.map((c) => (
              <TouchableOpacity key={c} style={[styles.chip, activeChild.curriculum === c && styles.chipActive]}
                onPress={() => { updateChild('curriculum', c); updateChild('grade', ''); }} activeOpacity={0.8}>
                <Text style={[styles.chipTxt, activeChild.curriculum === c && styles.chipTxtActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.lbl}>Child&apos;s Grade</Text>
        <View style={styles.gradeGroupsWrap}>
          {GRADE_GROUPS.map((group) => {
            const available = group.grades.filter((g) => getGradesForCurriculum(activeChild.curriculum).includes(g));
            if (available.length === 0) return null;
            return (
              <View key={group.label} style={styles.gradeGroup}>
                <View style={styles.gradeGroupHead}>
                  <View style={styles.gradeGroupDot} />
                  <Text style={styles.gradeGroupLbl}>{group.label}</Text>
                </View>
                <View style={styles.chipRow}>
                  {available.map((g) => (
                    <TouchableOpacity key={g} style={[styles.chip, activeChild.grade === g && styles.chipActive]}
                      onPress={() => updateChild('grade', g)} activeOpacity={0.8}>
                      <Text style={[styles.chipTxt, activeChild.grade === g && styles.chipTxtActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
