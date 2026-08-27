import React from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './shared';

interface RecoveryModalProps {
  visible: boolean;
  onClose: () => void;
  recoveryStep: 'email' | 'otp';
  setRecoveryStep: (v: 'email' | 'otp') => void;
  recoveryEmail: string;
  setRecoveryEmail: (v: string) => void;
  setRecoveryError: (v: string) => void;
  recoveryOtp: string;
  setRecoveryOtp: (v: string) => void;
  recoveryError: string;
  recoverySending: boolean;
  modalLoading: boolean;
  onSendCode: () => void;
  onVerifyOtp: () => void;
  colors: any;
  styles: any;
}

export default function RecoveryModal({
  visible, onClose, recoveryStep, setRecoveryStep, recoveryEmail, setRecoveryEmail,
  setRecoveryError, recoveryOtp, setRecoveryOtp, recoveryError, recoverySending,
  modalLoading, onSendCode, onVerifyOtp, colors, styles,
}: RecoveryModalProps) {
  return (
    <AppModal visible={visible} title="Set Recovery Email" onClose={onClose} styles={styles} colors={colors} testID="settings-modal-recovery">
      {recoveryStep === 'email' ? (
        <>
          <Text style={styles.modalNote}>
            We&apos;ll send a 6-digit code to verify this email before saving it.
          </Text>
          <Text style={styles.modalFieldLabel}>Recovery Email</Text>
          <View style={styles.modalInput}>
            <Feather name="mail" size={15} color={colors.textDim} />
            <TextInput
              testID="settings-modal-recovery-email-input"
              style={styles.modalTextInput}
              value={recoveryEmail}
              onChangeText={(v) => { setRecoveryEmail(v); setRecoveryError(''); }}
              placeholder="backup@example.com"
              placeholderTextColor={colors.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
          </View>
          {!!recoveryError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID="settings-modal-recovery-error">{recoveryError}</Text>}
          <ModalButtons onCancel={onClose} onSave={onSendCode} loading={recoverySending} saveLabel="Send Code" styles={styles} testIDPrefix="settings-modal-recovery-email" />
        </>
      ) : (
        <>
          <Text style={styles.modalNote}>
            Enter the 6-digit code sent to <Text style={{ color: colors.textMain, fontWeight: '700' }}>{recoveryEmail}</Text>. It expires in 10 minutes.
          </Text>
          <Text style={styles.modalFieldLabel}>Verification Code</Text>
          <View style={styles.modalInput}>
            <Feather name="shield" size={15} color={colors.textDim} />
            <TextInput
              testID="settings-modal-recovery-otp-input"
              style={[styles.modalTextInput, { letterSpacing: 6, fontSize: 20, fontWeight: '700' }]}
              value={recoveryOtp}
              onChangeText={(v) => { setRecoveryOtp(v.replace(/\D/g, '').slice(0, 6)); setRecoveryError(''); }}
              placeholder="000000"
              placeholderTextColor={colors.textDim}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>
          {!!recoveryError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID="settings-modal-recovery-otp-error">{recoveryError}</Text>}
          <TouchableOpacity onPress={() => { setRecoveryStep('email'); setRecoveryOtp(''); setRecoveryError(''); }} style={{ marginTop: 8 }} testID="settings-modal-recovery-back-button">
            <Text style={{ fontSize: 12, color: colors.accentYellow }}>← Change email or resend code</Text>
          </TouchableOpacity>
          <ModalButtons onCancel={onClose} onSave={onVerifyOtp} loading={modalLoading} saveLabel="Verify & Save" styles={styles} testIDPrefix="settings-modal-recovery-otp" />
        </>
      )}
    </AppModal>
  );
}
