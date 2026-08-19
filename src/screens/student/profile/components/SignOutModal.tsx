import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import type { AppColors } from '../../../../theme';

interface SignOutModalProps {
  colors: AppColors;
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Confirmation modal before signing the student out.
export function SignOutModal({ colors, visible, onCancel, onConfirm }: SignOutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.cardDark, borderRadius: 16, padding: 28, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: colors.borderColor }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, marginBottom: 8 }}>Sign Out</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 24 }}>Are you sure you want to sign out of your account?</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{ flex: 1, padding: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center' }}
            >
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={{ flex: 1, padding: 13, borderRadius: 10, backgroundColor: colors.accentRed, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
