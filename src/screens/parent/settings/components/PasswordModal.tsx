import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './AppModal';
import type { AppColors } from '../../../../theme';

export default function PasswordModal({ visible, data, styles, colors }: { visible: boolean; data: any; styles: any; colors: AppColors }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <AppModal visible={visible} title="Change Password" onClose={data.closeModal} styles={styles} colors={colors}>
      <Text style={styles.modalFieldLabel}>Current Password</Text>
      <View style={styles.modalInput}>
        <Feather name="lock" size={15} color={colors.textDim} />
        <TextInput
          style={[styles.modalTextInput, { flex: 1 }]} value={data.currentPw} onChangeText={data.setCurrentPw}
          placeholder="••••••••" placeholderTextColor={colors.textDim}
          secureTextEntry={!showCurrent} autoFocus
        />
        <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
          <Feather name={showCurrent ? 'eye-off' : 'eye'} size={15} color={colors.textDim} />
        </TouchableOpacity>
      </View>
      <Text style={styles.modalFieldLabel}>New Password</Text>
      <View style={styles.modalInput}>
        <Feather name="lock" size={15} color={colors.textDim} />
        <TextInput
          style={[styles.modalTextInput, { flex: 1 }]} value={data.newPw} onChangeText={data.setNewPw}
          placeholder="Min. 6 characters" placeholderTextColor={colors.textDim} secureTextEntry={!showNew}
        />
        <TouchableOpacity onPress={() => setShowNew(!showNew)}>
          <Feather name={showNew ? 'eye-off' : 'eye'} size={15} color={colors.textDim} />
        </TouchableOpacity>
      </View>
      <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
      <View style={styles.modalInput}>
        <Feather name="check" size={15} color={colors.textDim} />
        <TextInput
          style={styles.modalTextInput} value={data.confirmPw} onChangeText={data.setConfirmPw}
          placeholder="Repeat new password" placeholderTextColor={colors.textDim} secureTextEntry
        />
      </View>
      <ModalButtons onCancel={data.closeModal} onSave={data.handleChangePassword} loading={data.modalLoading} saveLabel="Change Password" styles={styles} />
    </AppModal>
  );
}
