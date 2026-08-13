import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

// ── Shared: confirm-close overlay ────────────────────────────────────────────
export function ConfirmCloseOverlay({ visible, color, colors, onConfirm, onCancel }: {
  visible: boolean; color: string; colors: AppColors;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 999, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{ backgroundColor: colors.cardDark, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: colors.borderColor, width: '100%', maxWidth: 380, gap: 16, alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="alert-triangle" size={26} color={color} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain, textAlign: 'center', fontFamily: fonts.serif }}>Close Assignment?</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
          Your progress will not be saved.{'\n'}Are you sure you want to go back?
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <TouchableOpacity onPress={onCancel} activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>Keep Going</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onConfirm} activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: color, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
