import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { SectionHead } from './common/SectionHead';
import type { makeStyles } from '../ProfileScreen';

interface LearningBuddyCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  cartoonOptions: string[];
}

// "Learning Buddy" card — Coming Soon, dimmed and non-interactive.
export function LearningBuddyCard({ styles, colors, isDark, cartoonOptions }: LearningBuddyCardProps) {
  return (
    <View style={[styles.card, { overflow: 'hidden' }]}>
      <View style={styles.cardHeadRow}>
        <SectionHead icon="smile" iconBg={isDark ? 'rgba(195,220,216,0.15)' : 'rgba(195,220,216,0.40)'} iconColor={colors.accentYellow} title="Learning Buddy" sub="Who inspires your learning?" />
        <View style={[styles.comingSoonBadge, { backgroundColor: colors.accentYellow + '18', borderColor: colors.accentYellow + '40' }]}>
          <Feather name="clock" size={11} color={colors.accentYellow} />
          <Text style={[styles.comingSoonText, { color: colors.accentYellow }]}>Coming Soon</Text>
        </View>
      </View>
      {/* Content dimmed — not interactive */}
      <View pointerEvents="none" style={{ opacity: 0.35 }}>
        <View style={styles.interestWrap}>
          {cartoonOptions.map(opt => (
            <View key={opt} style={styles.interestChip}>
              <Text style={styles.interestText}>{opt}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
