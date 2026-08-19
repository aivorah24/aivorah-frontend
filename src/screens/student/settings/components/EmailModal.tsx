import React from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './shared';

interface EmailModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail: string | undefined;
  isGoogleUser: boolean;
  emailStep: 'form' | 'otp';
  setEmailStep: (v: 'form' | 'otp') => void;
  newEmail: string;
  setNewEmail: (v: string) => void;
  emailPassword: string;
  setEmailPassword: (v: string) => void;
  emailOtp: string;
  setEmailOtp: (v: string) => void;
  emailError: string;
  modalLoading: boolean;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onResendOtp: () => void;
  onSwitchGoogleAccount: () => void;
  colors: any;
  styles: any;
}

export default function EmailModal({
  visible, onClose, userEmail, isGoogleUser, emailStep, setEmailStep,
  newEmail, setNewEmail, emailPassword, setEmailPassword, emailOtp, setEmailOtp,
  emailError, modalLoading, onSendOtp, onVerifyOtp, onResendOtp, onSwitchGoogleAccount,
  colors, styles,
}: EmailModalProps) {
  return (
    <AppModal visible={visible} title="Change Email Address" onClose={onClose} styles={styles} colors={colors} testID="settings-modal-email">
      {isGoogleUser ? (
        <>
          <Text style={styles.modalNote}>
            Your account signs in with Google, so its email is your Google account. To use a different
            address, switch to another Google account you own — we'll move your account and all its data
            onto it. You'll pick the account in a Google window.
          </Text>
          <View style={[styles.modalInput, { opacity: 0.7 }]}>
            <Feather name="mail" size={15} color={colors.textDim} />
            <Text style={[styles.modalTextInput, { color: colors.textDim }]} numberOfLines={1}>{userEmail}</Text>
          </View>
          {!!emailError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID="settings-modal-email-error">{emailError}</Text>}
          <ModalButtons
            onCancel={onClose}
            onSave={onSwitchGoogleAccount}
            loading={modalLoading}
            saveLabel="Switch Google Account"
            styles={styles}
            testIDPrefix="settings-modal-email-google"
          />
        </>
      ) : emailStep === 'form' ? (
        <>
          <Text style={styles.modalNote}>
            Enter your new email and current password to confirm.
          </Text>
          <Text style={styles.modalFieldLabel}>New Email</Text>
          <View style={styles.modalInput}>
            <Feather name="mail" size={15} color={colors.textDim} />
            <TextInput
              testID="settings-modal-email-new-input"
              style={styles.modalTextInput}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="new@example.com"
              placeholderTextColor={colors.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
          </View>
          <Text style={styles.modalFieldLabel}>Current Password</Text>
          <View style={styles.modalInput}>
            <Feather name="lock" size={15} color={colors.textDim} />
            <TextInput
              testID="settings-modal-email-password-input"
              style={styles.modalTextInput}
              value={emailPassword}
              onChangeText={setEmailPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textDim}
              secureTextEntry
            />
          </View>
          {!!emailError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID="settings-modal-email-error">{emailError}</Text>}
          <ModalButtons
            onCancel={onClose}
            onSave={onSendOtp}
            loading={modalLoading}
            saveLabel="Send Verification Code"
            styles={styles}
            testIDPrefix="settings-modal-email-form"
          />
        </>
      ) : (
        <>
          <Text style={styles.modalNote}>
            We sent a 6-digit code to <Text style={{ fontWeight: '700' }}>{newEmail.trim()}</Text>. Enter it below to confirm the change.
          </Text>
          <Text style={styles.modalFieldLabel}>Verification Code</Text>
          <View style={styles.modalInput}>
            <Feather name="shield" size={15} color={colors.textDim} />
            <TextInput
              testID="settings-modal-email-otp-input"
              style={styles.modalTextInput}
              value={emailOtp}
              onChangeText={setEmailOtp}
              placeholder="123456"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>
          <TouchableOpacity
            testID="settings-modal-email-resend-button"
            disabled={modalLoading}
            onPress={onResendOtp}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentYellow, marginTop: 4 }}>Resend code</Text>
          </TouchableOpacity>
          {!!emailError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 8 }} testID="settings-modal-email-otp-error">{emailError}</Text>}
          <ModalButtons
            onCancel={() => setEmailStep('form')}
            cancelLabel="Back"
            onSave={onVerifyOtp}
            loading={modalLoading}
            saveLabel="Verify & Update Email"
            styles={styles}
            testIDPrefix="settings-modal-email-otp"
          />
        </>
      )}
    </AppModal>
  );
}
