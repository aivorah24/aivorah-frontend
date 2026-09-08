import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './AppModal';
import type { AppColors } from '../../../../theme';

export default function EmailModal({ visible, data, styles, colors }: { visible: boolean; data: any; styles: any; colors: AppColors }) {
  return (
    <AppModal visible={visible} title="Change Email Address" onClose={data.closeModal} styles={styles} colors={colors}>
      {data.isGoogleUser ? (
        <>
          <Text style={styles.modalNote}>
            Your account signs in with Google, so its email is your Google account. To use a different
            address, switch to another Google account you own — we&apos;ll move your account and all its data
            onto it. You&apos;ll pick the account in a Google window.
          </Text>
          <View style={[styles.modalInput, { opacity: 0.7 }]}>
            <Feather name="mail" size={15} color={colors.textDim} />
            <Text style={[styles.modalTextInput, { color: colors.textDim }]} numberOfLines={1}>{data.user?.email}</Text>
          </View>
          {!!data.modalError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }}>{data.modalError}</Text>}
          <ModalButtons
            onCancel={data.closeModal}
            onSave={data.handleSwitchGoogleAccount}
            loading={data.modalLoading}
            saveLabel="Switch Google Account"
            styles={styles}
          />
        </>
      ) : data.emailStep === 'form' ? (
        <>
          <Text style={styles.modalNote}>Enter your new email and current password to confirm the change.</Text>
          <Text style={styles.modalFieldLabel}>New Email</Text>
          <View style={styles.modalInput}>
            <Feather name="mail" size={15} color={colors.textDim} />
            <TextInput
              style={styles.modalTextInput} value={data.newEmail} onChangeText={data.setNewEmail}
              placeholder="new@example.com" placeholderTextColor={colors.textDim}
              keyboardType="email-address" autoCapitalize="none" autoFocus
            />
          </View>
          <Text style={styles.modalFieldLabel}>Current Password</Text>
          <View style={styles.modalInput}>
            <Feather name="lock" size={15} color={colors.textDim} />
            <TextInput
              style={styles.modalTextInput} value={data.emailPassword} onChangeText={data.setEmailPassword}
              placeholder="••••••••" placeholderTextColor={colors.textDim} secureTextEntry
            />
          </View>
          {!!data.modalError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }}>{data.modalError}</Text>}
          <ModalButtons
            onCancel={data.closeModal}
            onSave={data.handleSendEmailOtp}
            loading={data.modalLoading}
            saveLabel="Send Verification Code"
            styles={styles}
          />
        </>
      ) : (
        <>
          <Text style={styles.modalNote}>
            We sent a 6-digit code to <Text style={{ fontWeight: '700' }}>{data.newEmail.trim()}</Text>. Enter it below to confirm the change.
          </Text>
          <Text style={styles.modalFieldLabel}>Verification Code</Text>
          <View style={styles.modalInput}>
            <Feather name="shield" size={15} color={colors.textDim} />
            <TextInput
              style={styles.modalTextInput} value={data.emailOtp} onChangeText={data.setEmailOtp}
              placeholder="123456" placeholderTextColor={colors.textDim}
              keyboardType="number-pad" maxLength={6} autoFocus
            />
          </View>
          <TouchableOpacity disabled={data.modalLoading} onPress={data.handleResendEmailOtp}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentYellow, marginTop: 4 }}>Resend code</Text>
          </TouchableOpacity>
          {!!data.modalError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 8 }}>{data.modalError}</Text>}
          <ModalButtons
            onCancel={() => data.setEmailStep('form')}
            cancelLabel="Back"
            onSave={data.handleVerifyEmailOtp}
            loading={data.modalLoading}
            saveLabel="Verify & Update Email"
            styles={styles}
          />
        </>
      )}
    </AppModal>
  );
}
