import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { spacing, fonts } from '../../../../theme';
import type { AppColors } from '../../../../theme';

export default function DeleteAccountModal({ visible, data, styles, colors }: { visible: boolean; data: any; styles: any; colors: AppColors }) {
  if (!visible) return null;
  return (
    <View style={{ position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as any, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, zIndex: 9999 }}>
      <View style={[styles.modalBox, { maxWidth: 380 }]}>
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentRed + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Feather name="trash-2" size={24} color={colors.accentRed} />
          </View>
          <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Delete Account?</Text>
          <Text style={[styles.modalNote, { textAlign: 'center', marginBottom: 0 }]}>
            This is permanent and cannot be undone. All your data will be lost.
          </Text>
        </View>
        {data.isPasswordUser ? (
          <>
            <Text style={styles.modalFieldLabel}>Enter your password to confirm</Text>
            <View style={styles.modalInput}>
              <Feather name="lock" size={15} color={colors.textDim} />
              <TextInput
                style={[styles.modalTextInput, { flex: 1 }]}
                value={data.deletePassword}
                onChangeText={(v: string) => { data.setDeletePassword(v); data.setDeleteError(''); }}
                placeholder="Your password" placeholderTextColor={colors.textDim}
                secureTextEntry autoFocus
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
        {!!data.deleteError && <Text style={{ fontFamily: fonts.serif, fontSize: 12, color: colors.accentRed, marginTop: 6 }}>{data.deleteError}</Text>}
        <View style={[styles.modalBtns, { marginTop: 20 }]}>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={() => data.setDeleteModalVisible(false)} disabled={data.deleteLoading}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.accentRed }, data.deleteLoading && { opacity: 0.7 }]}
            onPress={data.confirmDeleteAccount}
            disabled={data.deleteLoading}
          >
            {data.deleteLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.modalSaveText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
