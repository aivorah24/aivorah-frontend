import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './AppModal';
import type { AppColors } from '../../../../theme';

export default function NameModal({ visible, data, styles, colors }: { visible: boolean; data: any; styles: any; colors: AppColors }) {
  return (
    <AppModal visible={visible} title="Change Display Name" onClose={data.closeModal} styles={styles} colors={colors}>
      <Text style={styles.modalFieldLabel}>New Name</Text>
      <View style={styles.modalInput}>
        <Feather name="user" size={15} color={colors.textDim} />
        <TextInput
          style={styles.modalTextInput} value={data.newName} onChangeText={data.setNewName}
          placeholder="Your name" placeholderTextColor={colors.textDim}
          autoCapitalize="words" autoFocus
        />
      </View>
      <ModalButtons onCancel={data.closeModal} onSave={data.handleSaveName} loading={data.modalLoading} styles={styles} />
    </AppModal>
  );
}
