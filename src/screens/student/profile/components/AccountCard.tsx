import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import { SectionHead } from './common/SectionHead';
import type { makeStyles } from '../ProfileScreen';

interface AccountCardProps {
  styles: ReturnType<typeof makeStyles>;
  colors: AppColors;
  isDark: boolean;
  onNotifications: () => void;
  onPrivacy: () => void;
  onHelpCenter: () => void;
  onSignOut: () => void;
}

// "Account" card — Notifications / Privacy / Help Center / Sign Out rows.
export function AccountCard({ styles, colors, isDark, onNotifications, onPrivacy, onHelpCenter, onSignOut }: AccountCardProps) {
  const rows = [
    { icon: 'bell' as const,        label: 'Notifications', sub: 'Alerts and reminders',     cb: onNotifications, danger: false },
    { icon: 'shield' as const,      label: 'Privacy',       sub: 'Password, data settings',  cb: onPrivacy,       danger: false },
    { icon: 'help-circle' as const, label: 'Help Center',   sub: 'FAQs and support',         cb: onHelpCenter,    danger: false },
    { icon: 'log-out' as const,     label: 'Sign Out',      sub: 'Sign out of your account', cb: onSignOut,       danger: true  },
  ];

  return (
    <View style={styles.card}>
      <SectionHead icon="settings" iconBg={isDark ? 'rgba(168,181,179,0.12)' : 'rgba(168,181,179,0.2)'} iconColor={colors.textMuted} title="Account" />
      {rows.map((row, i, arr) => (
        <TouchableOpacity key={row.label} style={[styles.accountRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderColor }]} onPress={row.cb} activeOpacity={0.7}>
          <View style={[styles.accountIcon, row.danger && { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <Feather name={row.icon} size={15} color={row.danger ? colors.accentRed : colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.accountLabel, row.danger && { color: colors.accentRed }]}>{row.label}</Text>
            <Text style={styles.accountSub}>{row.sub}</Text>
          </View>
          {!row.danger && <Feather name="chevron-right" size={14} color={colors.textDim} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}
