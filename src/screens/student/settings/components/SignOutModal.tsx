import React from 'react';
import { Text, View, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SignOutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  colors: any;
  styles: any;
}

export default function SignOutModal({ visible, onClose, onConfirm, colors, styles }: SignOutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox} testID="settings-modal-signout">
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentRed + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Feather name="log-out" size={24} color={colors.accentRed} />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Sign Out?</Text>
            <Text style={[styles.modalNote, { textAlign: 'center', marginBottom: 0 }]}>
              You will be returned to the login screen. Your progress is saved.
            </Text>
          </View>
          <View style={[styles.modalBtns, { marginTop: 20 }]}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} testID="settings-modal-signout-cancel-button">
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.accentRed }]} onPress={onConfirm} testID="settings-modal-signout-confirm-button">
              <Text style={styles.modalSaveText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
