import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { SectionHead } from './common/SectionHead';
import type { makeStyles } from '../ProfileScreen';

interface SubjectOption {
  id: string;
  label: string;
  color: string;
}

interface SubjectsCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  subjectOptions: SubjectOption[];
  interests: string[];
  onToggleInterest: (id: string) => void;
}

// "Subjects I Love" card — multi-select interest chips.
export function SubjectsCard({ styles, colors, isDark, subjectOptions, interests, onToggleInterest }: SubjectsCardProps) {
  return (
    <View style={styles.card}>
      <SectionHead icon="heart" iconBg={isDark ? 'rgba(239,209,212,0.18)' : 'rgba(239,209,212,0.45)'} iconColor={colors.accentRed} title="Subjects I Love" sub="We'll recommend content you enjoy" />
      <View style={styles.interestWrap}>
        {subjectOptions.map(s => {
          const active = interests.includes(s.id);
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.interestChip, active && { borderColor: s.color, backgroundColor: isDark ? `${s.color}18` : `${s.color}10` }]}
              onPress={() => onToggleInterest(s.id)}
            >
              {active && <Feather name="check" size={11} color={s.color} />}
              <Text style={[styles.interestText, active && { color: s.color, fontWeight: '700' }]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
