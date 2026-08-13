import React from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './shared';

interface PasswordModalProps {
  visible: boolean;
  onClose: () => void;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showCurrent: boolean;
  setShowCurrent: (v: boolean) => void;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  passwordError: string;
  modalLoading: boolean;
  onSave: () => void;
  colors: any;
  styles: any;
}

export default function PasswordModal({
  visible, onClose, currentPassword, setCurrentPassword, newPassword, setNewPassword,
  confirmPassword, setConfirmPassword, showCurrent, setShowCurrent, showNew, setShowNew,
  passwordError, modalLoading, onSave, colors, styles,
}: PasswordModalProps) {
  return (
    <AppModal visible={visible} title="Change Password" onClose={onClose} styles={styles} colors={colors} testID="settings-modal-password">
      <Text style={styles.modalFieldLabel}>Current Password</Text>
      <View style={styles.modalInput}>
        <Feather name="lock" size={15} color={colors.textDim} />
        <TextInput
          testID="settings-modal-password-current-input"
          style={[styles.modalTextInput, { flex: 1 }]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textDim}
          secureTextEntry={!showCurrent}
          autoFocus
        />
        <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} testID="settings-modal-password-current-toggle">
          <Feather name={showCurrent ? 'eye-off' : 'eye'} size={15} color={colors.textDim} />
        </TouchableOpacity>
      </View>
      <Text style={styles.modalFieldLabel}>New Password</Text>
      <View style={styles.modalInput}>
        <Feather name="lock" size={15} color={colors.textDim} />
        <TextInput
          testID="settings-modal-password-new-input"
          style={[styles.modalTextInput, { flex: 1 }]}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Min. 6 characters"
          placeholderTextColor={colors.textDim}
          secureTextEntry={!showNew}
        />
        <TouchableOpacity onPress={() => setShowNew(!showNew)} testID="settings-modal-password-new-toggle">
          <Feather name={showNew ? 'eye-off' : 'eye'} size={15} color={colors.textDim} />
        </TouchableOpacity>
      </View>
      <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
      <View style={styles.modalInput}>
        <Feather name="check" size={15} color={colors.textDim} />
        <TextInput
          testID="settings-modal-password-confirm-input"
          style={styles.modalTextInput}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          placeholderTextColor={colors.textDim}
          secureTextEntry
        />
      </View>
      {!!passwordError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID="settings-modal-password-error">{passwordError}</Text>}
      <ModalButtons onCancel={onClose} onSave={onSave} loading={modalLoading} saveLabel="Change Password" styles={styles} testIDPrefix="settings-modal-password" />
    </AppModal>
  );
}
