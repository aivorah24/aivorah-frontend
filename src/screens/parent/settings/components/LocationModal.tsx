import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './AppModal';
import type { AppColors } from '../../../../theme';

export default function LocationModal({ visible, data, styles, colors }: { visible: boolean; data: any; styles: any; colors: AppColors }) {
  return (
    <AppModal visible={visible} title="Location" onClose={data.closeModal} styles={styles} colors={colors}>
      <Text style={styles.modalFieldLabel}>City</Text>
      <View style={styles.modalInput}>
        <Feather name="map-pin" size={15} color={colors.textDim} />
        <TextInput
          style={styles.modalTextInput} value={data.newLocation} onChangeText={data.setNewLocation}
          placeholder="e.g. Salem" placeholderTextColor={colors.textDim}
          autoCapitalize="words" autoFocus
        />
      </View>
      {data.modalError ? <Text style={{ color: colors.accentRed, fontSize: 13, marginTop: 8 }}>{data.modalError}</Text> : null}
      <ModalButtons onCancel={data.closeModal} onSave={data.handleSaveLocation} loading={data.modalLoading} saveLabel="Save" styles={styles} />
    </AppModal>
  );
}
