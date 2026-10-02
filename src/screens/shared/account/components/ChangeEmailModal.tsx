/**
 * Change Email window shared by student, parent and teacher settings.
 * Uses the calling screen's modal styles (modalOverlay, modalBox, modalInput…)
 * so it matches each persona's look.
 */
import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AppColors } from '../../../../theme';
import type { EmailChange } from '../hooks/useEmailChange';

const T = 'settings-modal-email';

function Buttons({ onCancel, onSave, loading, saveLabel, cancelLabel = 'Cancel', styles, id }: {
  onCancel: () => void; onSave: () => void; loading: boolean; saveLabel: string; cancelLabel?: string; styles: any; id: string;
}) {
  return (
    <View style={styles.modalBtns}>
      <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} disabled={loading} testID={`${id}-cancel-button`}>
        <Text style={styles.modalCancelText}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.modalSaveBtn} onPress={onSave} disabled={loading} testID={`${id}-save-button`}>
        {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>{saveLabel}</Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function ChangeEmailModal({ visible, onClose, onSignOut, userEmail, emailChange: ec, styles, colors }: {
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  userEmail?: string;
  emailChange: EmailChange;
  styles: any;
  colors: AppColors;
}) {
  // After a successful change the old session is stale: closing means signing out.
  const close = ec.step === 'done' ? onSignOut : onClose;
  const errorText = !!ec.error && (
    <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID={`${T}-error`}>{ec.error}</Text>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={ec.loading ? undefined : close}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox} testID={T}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{ec.step === 'done' ? 'Email Updated' : 'Change Email Address'}</Text>
            {!ec.loading && (
              <TouchableOpacity onPress={close} testID={`${T}-close-button`} accessibilityLabel="Close">
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {ec.step === 'done' ? (
            <>
              <Text style={styles.modalNote} testID={`${T}-done-message`}>{ec.doneMessage}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
                <Pressable
                  onPress={onSignOut}
                  testID={`${T}-sign-in-again-button`}
                  accessibilityRole="button"
                  style={(state) => {
                    const { pressed, hovered } = state as { pressed: boolean; hovered?: boolean };
                    return {
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 9, paddingHorizontal: 22, borderRadius: 8,
                      backgroundColor: colors.accentYellow,
                      opacity: pressed ? 0.8 : hovered ? 0.92 : 1,
                      transform: [{ translateY: hovered && !pressed ? -1 : 0 }],
                      ...(hovered ? { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } } : {}),
                    };
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.2 }}>Sign in again</Text>
                </Pressable>
              </View>
            </>
          ) : ec.isGoogleUser ? (
            <>
              <Text style={styles.modalNote}>
                Your account signs in with Google, so its email is your Google account. To use a different address, switch to
                another Google account you own — we&apos;ll move your account and all its data onto it. You&apos;ll pick the account in a
                Google window.
              </Text>
              <View style={[styles.modalInput, { opacity: 0.7 }]}>
                <Feather name="mail" size={15} color={colors.textDim} />
                <Text style={[styles.modalTextInput, { color: colors.textDim }]} numberOfLines={1}>{userEmail}</Text>
              </View>
              {errorText}
              <Buttons onCancel={onClose} onSave={ec.switchGoogleAccount} loading={ec.loading} saveLabel="Switch Google Account" styles={styles} id={`${T}-google`} />
            </>
          ) : ec.step === 'form' ? (
            <>
              <Text style={styles.modalNote}>Enter your new email and current password to confirm.</Text>
              <Text style={styles.modalFieldLabel}>New Email</Text>
              <View style={styles.modalInput}>
                <Feather name="mail" size={15} color={colors.textDim} />
                <TextInput
                  testID={`${T}-new-input`} style={styles.modalTextInput} value={ec.newEmail} onChangeText={ec.setNewEmail}
                  placeholder="new@example.com" placeholderTextColor={colors.textDim} keyboardType="email-address" autoCapitalize="none" autoFocus
                />
              </View>
              <Text style={styles.modalFieldLabel}>Current Password</Text>
              <View style={styles.modalInput}>
                <Feather name="lock" size={15} color={colors.textDim} />
                <TextInput
                  testID={`${T}-password-input`} style={styles.modalTextInput} value={ec.password} onChangeText={ec.setPassword}
                  placeholder="••••••••" placeholderTextColor={colors.textDim} secureTextEntry
                />
              </View>
              {errorText}
              <Buttons onCancel={onClose} onSave={ec.sendOtp} loading={ec.loading} saveLabel="Send Verification Code" styles={styles} id={`${T}-form`} />
            </>
          ) : (
            <>
              <Text style={styles.modalNote}>
                We sent a 6-digit code to <Text style={{ fontWeight: '700' }}>{ec.newEmail.trim()}</Text>. Enter it below to confirm the change.
              </Text>
              <Text style={styles.modalFieldLabel}>Verification Code</Text>
              <View style={styles.modalInput}>
                <Feather name="shield" size={15} color={colors.textDim} />
                <TextInput
                  testID={`${T}-otp-input`} style={styles.modalTextInput} value={ec.otp} onChangeText={ec.setOtp}
                  placeholder="123456" placeholderTextColor={colors.textDim} keyboardType="number-pad" maxLength={6} autoFocus
                />
              </View>
              <TouchableOpacity testID={`${T}-resend-button`} disabled={ec.loading} onPress={ec.resendOtp}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentYellow, marginTop: 4 }}>Resend code</Text>
              </TouchableOpacity>
              {!!ec.info && <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }} testID={`${T}-info`}>{ec.info}</Text>}
              {errorText}
              <Buttons onCancel={ec.backToForm} cancelLabel="Back" onSave={ec.verifyOtp} loading={ec.loading} saveLabel="Verify & Update Email" styles={styles} id={`${T}-otp`} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
