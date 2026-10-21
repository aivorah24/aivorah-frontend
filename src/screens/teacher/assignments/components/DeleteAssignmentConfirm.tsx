import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

export function DeleteAssignmentConfirm({ title, colors, onConfirm, onCancel }: {
  title: string | null;
  colors: AppColors;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={title !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth: 380, borderRadius: 16, padding: 20, gap: 12, backgroundColor: colors.cardDark, borderWidth: 1, borderColor: colors.borderColor }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="trash-2" size={18} color={colors.accentRed} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>Delete assignment?</Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 20 }}>
            {`"${title}" will be removed for all students. This can't be undone.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity testID="delete-assignment-cancel" onPress={onCancel} activeOpacity={0.8}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMain }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="delete-assignment-confirm" onPress={onConfirm} activeOpacity={0.8}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: colors.accentRed, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
