import React from 'react';
import { Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEAL, SAGE } from '../constants';

interface Props {
  streak: number;
  textMuted: string;
  styles: any;
}

export default function MotivationFooter({ streak, textMuted, styles }: Props) {
  return (
    <LinearGradient
      colors={[TEAL + '20', SAGE + '15']}
      style={[styles.motivationCard, { borderColor: TEAL + '30' }]}
    >
      <Feather name="heart" size={16} color={TEAL} />
      <Text style={[styles.motivationText, { color: textMuted }]}>
        {streak >= 7
          ? `${streak} days strong! You are building real character.`
          : 'Every great person started with small daily habits. You\'re on your way!'}
      </Text>
    </LinearGradient>
  );
}
