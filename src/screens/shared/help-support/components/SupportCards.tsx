import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export function SupportCards({
  colors, styles, onOpenChat, onOpenTicket,
}: {
  colors: any; styles: any; onOpenChat: () => void; onOpenTicket: () => void;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Still need help?</Text>
      <View style={styles.supportRow}>
        <TouchableOpacity accessibilityRole="button" style={[styles.supportCard, styles.supportCardPrimary]} onPress={onOpenChat} activeOpacity={0.7}>
          <View style={styles.supportIconWrap}>
            <Feather name="message-circle" size={24} color={colors.accentYellow} />
          </View>
          <Text style={styles.supportTitle}>Aivorah 24/7</Text>
          <Text style={styles.supportSub}>Instant platform support</Text>
          <View style={styles.supportArrow}>
            <Feather name="arrow-right" size={14} color={colors.accentYellow} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.supportCard} onPress={onOpenTicket} activeOpacity={0.7}>
          <View style={[styles.supportIconWrap, { backgroundColor: colors.accentYellow + '18' }]}>
            <Feather name="send" size={24} color={colors.accentYellow} />
          </View>
          <Text style={styles.supportTitle}>Submit Ticket</Text>
          <Text style={styles.supportSub}>We&apos;ll reply within 24h</Text>
          <View style={[styles.supportArrow, { backgroundColor: colors.accentYellow + '15' }]}>
            <Feather name="arrow-right" size={14} color={colors.accentYellow} />
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}
