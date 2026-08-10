import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ChangePasswordModal({
  visible, onClose, currentPass, setCurrentPass, newPass, setNewPass, confirmPass, setConfirmPass,
  passError, passSuccess, passLoading, onSubmit, colors, s,
}: {
  visible: boolean; onClose: () => void;
  currentPass: string; setCurrentPass: (v: string) => void;
  newPass: string; setNewPass: (v: string) => void;
  confirmPass: string; setConfirmPass: (v: string) => void;
  passError: string; passSuccess: boolean; passLoading: boolean;
  onSubmit: () => void; colors: any; s: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {passSuccess ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
              <Feather name="check-circle" size={48} color={colors.accentGreen} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>Password Updated!</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Your password has been changed successfully.</Text>
            </View>
          ) : (
            <>
              <Text style={s.modalLabel}>Current Password</Text>
              <TextInput style={s.modalInput} value={currentPass} onChangeText={setCurrentPass}
                placeholder="Enter current password" placeholderTextColor={colors.textDim} secureTextEntry />
              <Text style={s.modalLabel}>New Password</Text>
              <TextInput style={s.modalInput} value={newPass} onChangeText={setNewPass}
                placeholder="At least 6 characters" placeholderTextColor={colors.textDim} secureTextEntry />
              <Text style={s.modalLabel}>Confirm New Password</Text>
              <TextInput style={s.modalInput} value={confirmPass} onChangeText={setConfirmPass}
                placeholder="Re-enter new password" placeholderTextColor={colors.textDim} secureTextEntry />
              {passError ? <Text style={{ color: '#ef4444', fontSize: 13 }}>{passError}</Text> : null}
              <TouchableOpacity style={s.saveBtn} onPress={onSubmit} disabled={passLoading} activeOpacity={0.85}>
                <Text style={s.saveBtnText}>{passLoading ? 'Updating...' : 'Update Password'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
