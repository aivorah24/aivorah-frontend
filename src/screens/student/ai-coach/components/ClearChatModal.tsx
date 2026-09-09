import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';

// Replaces Alert.alert('Clear Chat', ...), which is a documented no-op on
// React Native Web — the confirmation never appeared there and Clear Chat
// silently did nothing. A real modal works on every platform.
export default function ClearChatModal({
  visible, onCancel, onConfirm, colors, styles,
}: {
  visible: boolean; onCancel: () => void; onConfirm: () => void;
  colors: AppColors; styles: any;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.clearChatOverlay}>
        <View style={styles.clearChatBox}>
          <View style={styles.clearChatIcon}>
            <Feather name="trash-2" size={22} color={colors.accentRed} />
          </View>
          <Text style={styles.clearChatTitle}>Clear Chat</Text>
          <Text style={styles.clearChatBody}>Start a new conversation?</Text>
          <TouchableOpacity
            style={styles.clearChatConfirmBtn}
            activeOpacity={0.85}
            onPress={onConfirm}
          >
            <Text style={styles.clearChatConfirmText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearChatCancelBtn}
            activeOpacity={0.7}
            onPress={onCancel}
          >
            <Text style={styles.clearChatCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
