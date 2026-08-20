import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { SectionHead } from './common/SectionHead';
import type { makeStyles } from '../ProfileScreen';

interface LearningStyleOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
}

interface LearningStyleCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  learningStyles: LearningStyleOption[];
  learningStyle: string;
  onSelect: (id: string) => void;
}

// "How I Learn Best" card — a single-select grid of learning-style options.
export function LearningStyleCard({ styles, colors, isDark, learningStyles, learningStyle, onSelect }: LearningStyleCardProps) {
  return (
    <View style={styles.card}>
      <SectionHead icon="cpu" iconBg={isDark ? 'rgba(197,189,150,0.18)' : 'rgba(197,189,150,0.35)'} iconColor={colors.accentYellow} title="How I Learn Best" sub="Personalises your AI Coach experience" />
      <View style={styles.styleGrid}>
        {learningStyles.map(s => {
          const active = learningStyle === s.id;
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.styleCard, active && { borderColor: s.color, backgroundColor: isDark ? `${s.color}18` : `${s.color}10` }]}
              onPress={() => onSelect(s.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.styleIconWrap, { backgroundColor: `${s.color}20` }]}>
                <Feather name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.styleLabel, active && { color: s.color }]}>{s.label}</Text>
              <Text style={styles.styleDesc}>{s.desc}</Text>
              {active && <View style={[styles.styleCheck, { backgroundColor: s.color }]}><Feather name="check" size={9} color="white" /></View>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
