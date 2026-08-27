import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import type { AppColors } from '../../../../theme';
import { spacing } from '../../../../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  colors: AppColors;
  styles: any;
  editText: string;
  setEditText: (v: string) => void;
  onSave: () => void;
}

export default function EditMessageModal({ visible, onClose, colors, styles, editText, setEditText, onSave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { padding: spacing.lg }]}>
          <Text style={styles.modalTitle}>Edit Message</Text>
          <TextInput
            style={[styles.input, { marginTop: spacing.md, minHeight: 80 }]}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            placeholderTextColor={colors.textDim}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSave} style={styles.saveBtn} activeOpacity={0.7}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
