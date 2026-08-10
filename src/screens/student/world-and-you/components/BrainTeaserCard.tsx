import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { FunChallenge } from '../types';
import { TEAL, ROSE } from '../constants';

interface Props {
  challenge: FunChallenge;
  showAnswer: boolean;
  onReveal: () => void;
  styles: any;
  colors: AppColors;
}

export default function BrainTeaserCard({ challenge, showAnswer, onReveal, styles, colors }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: ROSE + '20' }]}>
          <Feather name="zap" size={15} color={ROSE} />
        </View>
        <View>
          <Text style={[styles.cardTitle, { color: ROSE }]}>Brain Teaser</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>Can you figure it out?</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: ROSE + '25' }]} />

      <Text style={[styles.challengeQ, { color: colors.textMain }]}>
        {challenge.question}
      </Text>

      {showAnswer ? (
        <View style={[styles.answerBox, { backgroundColor: TEAL + '15', borderColor: TEAL + '40' }]}>
          <Feather name="check-circle" size={15} color={TEAL} />
          <Text style={[styles.answerText, { color: TEAL }]}>{challenge.answer}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.revealBtn, { backgroundColor: ROSE + '18', borderColor: ROSE + '50' }]}
          onPress={onReveal}
          activeOpacity={0.8}
        >
          <Feather name="eye" size={13} color={ROSE} />
          <Text style={[styles.revealBtnText, { color: ROSE }]}>Reveal Answer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
