import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal } from './AppModal';
import type { AppColors } from '../../../../theme';

export default function SsoInfoModal({ visible, onClose, styles, colors }: { visible: boolean; onClose: () => void; styles: any; colors: AppColors }) {
  return (
    <AppModal visible={visible} title="Google Sign-In Account" onClose={onClose} styles={styles} colors={colors}>
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentYellow + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Feather name="shield" size={24} color={colors.accentYellow} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain, textAlign: 'center', marginBottom: 8 }}>
          Managed via Google Sign-In
        </Text>
        <Text style={{ fontSize: 13, color: colors.textDim, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
          You signed into Aivorah securely using your Google Account. Your password and account security are protected by Google. To change your password or security settings, please visit your Google Account Security settings (myaccount.google.com).
        </Text>
        <TouchableOpacity style={[styles.modalSaveBtn, { width: '100%', marginTop: 8 }]} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.modalSaveText}>Understood</Text>
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}
