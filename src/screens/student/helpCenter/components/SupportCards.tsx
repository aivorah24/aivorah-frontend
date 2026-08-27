import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

interface SupportCardsProps {
  colors: AppColors;
  isDark: boolean;
  onOpenChat: () => void;
  onOpenTicket: () => void;
}

export default function SupportCards({ colors, isDark, onOpenChat, onOpenTicket }: SupportCardsProps) {
  const styles = makeStyles(colors, isDark);

  return (
    <View style={styles.supportRow}>
      <TouchableOpacity style={[styles.supportCard, styles.supportCardChat]} onPress={onOpenChat} activeOpacity={0.75}>
        <View style={styles.supportCardInner}>
          <Text style={styles.supportCardTitle}>Chat with Aivorah 24/7</Text>
          <Text style={styles.supportCardSub}>Get instant answers about{'\n'}XP, streaks, badges,{'\n'}learning paths & more.</Text>
          <View style={[styles.supportArrowBtn, { backgroundColor: colors.accentYellow + 'CC' }]}>
            <Feather name="arrow-right" size={16} color={isDark ? '#0B140F' : '#fff'} />
          </View>
        </View>
        <View style={styles.owlWrap}>
          <View style={styles.owlCircle}>
            <Feather name="zap" size={28} color={colors.accentYellow} />
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.supportCard, styles.supportCardTicket]} onPress={onOpenTicket} activeOpacity={0.75}>
        <View style={styles.ticketIconWrap}>
          <Feather name="mail" size={28} color={colors.textMuted} />
        </View>
        <Text style={styles.supportCardTitle}>Submit a Ticket</Text>
        <Text style={styles.supportCardSub}>We&apos;ll reply within 24h</Text>
        <View style={[styles.supportArrowBtn, { backgroundColor: colors.accentYellow + '20', borderWidth: 1, borderColor: colors.accentYellow + '40' }]}>
          <Feather name="arrow-right" size={16} color={colors.accentYellow} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: AppColors, isDark: boolean) => StyleSheet.create({
  supportRow: { flexDirection: 'row', gap: spacing.md },
  supportCard: { flex: 1, borderRadius: radius.xl, padding: spacing.xl, overflow: 'hidden', minHeight: 180 },
  supportCardChat: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.accentYellow + '30' },
  supportCardTicket: { backgroundColor: c.cardDark, borderWidth: 1, borderColor: c.borderColor, alignItems: 'flex-start', justifyContent: 'space-between' },
  supportCardInner: { flex: 1, gap: 8, zIndex: 1 },
  supportCardTitle: { fontSize: 16, fontWeight: '800', color: c.textMain, fontFamily: fonts.serif },
  supportCardSub: { fontSize: 12, color: isDark ? 'rgba(245,243,238,0.55)' : c.textMuted, lineHeight: 18 },
  supportArrowBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 8, alignSelf: 'flex-start' },
  owlWrap: { position: 'absolute', bottom: 0, right: 0, width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  owlCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#1E1E1E' : '#2A2A2A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.accentYellow + '40' },
  ticketIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.bgDark, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
