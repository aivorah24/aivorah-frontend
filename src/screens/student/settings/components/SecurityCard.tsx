import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ModalType } from '../types';

interface SecurityCardProps {
  isPasswordUser: boolean;
  recoverySaved: string;
  onOpenModal: (type: ModalType) => void;
  colors: any;
  styles: any;
}

export default function SecurityCard({ isPasswordUser, recoverySaved, onOpenModal, colors, styles }: SecurityCardProps) {
  const rows = [
    { icon: 'lock', label: 'Password', sub: isPasswordUser ? 'Change your account password' : 'Managed via Google Sign-In', btn: isPasswordUser ? 'Change' : 'Google SSO', badgeOnly: !isPasswordUser, onPress: isPasswordUser ? () => onOpenModal('password') : () => onOpenModal('ssoInfo'), key2: 'password' },
    { icon: 'mail', label: 'Recovery Email', sub: recoverySaved || 'Backup email for account recovery', btn: recoverySaved ? 'Update' : 'Set', onPress: () => onOpenModal('recovery'), key2: 'recovery' },
    { icon: 'shield', label: 'Two-Factor Auth', sub: 'Add an extra layer of security', btn: 'Soon', onPress: null, key2: 'twofactor' },
  ];

  return (
    <View style={styles.card}>
      {rows.map((r: any, i) => (
        <View key={r.label}>
          {i > 0 && <View style={styles.rowDivider} />}
          <View style={styles.iconRow} testID={`settings-security-${r.key2}-row`}>
            <View style={styles.iconBox}><Feather name={r.icon as any} size={18} color={colors.textMuted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{r.label}</Text>
              <Text style={styles.fieldSub}>{r.sub}</Text>
            </View>
            {r.badgeOnly ? (
              <TouchableOpacity style={[styles.editBtn, { borderColor: colors.accentYellow + '50', backgroundColor: colors.accentYellow + '14' }]} onPress={r.onPress} activeOpacity={0.7} testID={`settings-security-${r.key2}-button`}>
                <Text style={[styles.editBtnText, { color: colors.accentYellow }]}>{r.btn}</Text>
              </TouchableOpacity>
            ) : r.onPress ? (
              <TouchableOpacity style={styles.editBtn} onPress={r.onPress} activeOpacity={0.7} testID={`settings-security-${r.key2}-button`}>
                <Text style={styles.editBtnText}>{r.btn}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.comingSoonBadge} testID={`settings-security-${r.key2}-badge`}><Text style={styles.comingSoonText}>Soon</Text></View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
