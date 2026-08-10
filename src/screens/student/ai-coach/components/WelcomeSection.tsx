import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

interface Props {
  userGrade: string;
  suggestions: string[];
  onSuggestionPress: (s: string) => void;
  styles: any;
  colors: AppColors;
}

export default function WelcomeSection({ userGrade, suggestions, onSuggestionPress, styles, colors }: Props) {
  return (
    <View style={styles.welcomeSection}>
      <View style={styles.welcomeIconWrap}>
        <Feather name="zap" size={28} color={colors.accentYellow} />
      </View>
      <Text style={styles.welcomeTitle}>Aivorah AI Coach</Text>
      <Text style={styles.welcomeSub}>Ask me anything about your {userGrade} curriculum</Text>
      <View style={styles.suggestionsGrid}>
        {suggestions.map((s) => (
          <TouchableOpacity
            key={s}
            style={styles.suggestionCard}
            onPress={() => onSuggestionPress(s)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionText} numberOfLines={2}>{s}</Text>
            <Feather name="arrow-up-right" size={14} color={colors.textDim} style={{ marginTop: 4 }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
