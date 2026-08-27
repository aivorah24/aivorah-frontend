import React from 'react';
import { Text, View, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  isPasswordUser: boolean;
  deletePassword: string;
  setDeletePassword: (v: string) => void;
  setDeleteError: (v: string) => void;
  deleteError: string;
  deleteLoading: boolean;
  onConfirm: () => void;
  colors: any;
  styles: any;
}

export default function DeleteModal({ visible, onClose, isPasswordUser, deletePassword, setDeletePassword, setDeleteError, deleteError, deleteLoading, onConfirm, colors, styles }: DeleteModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox} testID="settings-modal-delete">
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentRed + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Feather name="trash-2" size={24} color={colors.accentRed} />
            </View>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Delete Account?</Text>
            <Text style={[styles.modalNote, { textAlign: 'center', marginBottom: 0 }]}>
              This is permanent and cannot be undone. All your progress, XP, and data will be lost.
            </Text>
          </View>
          {isPasswordUser ? (
            <>
              <Text style={styles.modalFieldLabel}>Enter your password to confirm</Text>
              <View style={styles.modalInput}>
                <Feather name="lock" size={15} color={colors.textDim} />
                <TextInput
                  testID="settings-modal-delete-password-input"
                  style={[styles.modalTextInput, { flex: 1 }]}
                  value={deletePassword}
                  onChangeText={(v) => { setDeletePassword(v); setDeleteError(''); }}
                  placeholder="Your password"
                  placeholderTextColor={colors.textDim}
                  secureTextEntry
                  autoFocus
                />
              </View>
            </>
          ) : (
            <View style={[styles.modalInput, { gap: 8 }]}>
              <Feather name="shield" size={15} color={colors.textDim} />
              <Text style={[styles.modalTextInput, { flex: 1, color: colors.textMuted }]} numberOfLines={2}>
                You&apos;ll confirm with Google to delete your account.
              </Text>
            </View>
          )}
          {!!deleteError && (
            <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID="settings-modal-delete-error">{deleteError}</Text>
          )}
          <View style={[styles.modalBtns, { marginTop: 20 }]}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={deleteLoading} testID="settings-modal-delete-cancel-button">
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="settings-modal-delete-confirm-button"
              style={[styles.modalSaveBtn, { backgroundColor: colors.accentRed }, deleteLoading && { opacity: 0.7 }]}
              onPress={onConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? <ActivityIndicator color="white" size="small" />
                : <Text style={styles.modalSaveText}>Delete</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
