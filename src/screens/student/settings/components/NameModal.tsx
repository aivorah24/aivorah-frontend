import React from 'react';
import { Text, View, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppModal, ModalButtons } from './shared';

interface NameModalProps {
  visible: boolean;
  onClose: () => void;
  newName: string;
  setNewName: (v: string) => void;
  nameError: string;
  setNameError: (v: string) => void;
  onSave: () => void;
  loading: boolean;
  colors: any;
  styles: any;
}

export default function NameModal({ visible, onClose, newName, setNewName, nameError, setNameError, onSave, loading, colors, styles }: NameModalProps) {
  return (
    <AppModal visible={visible} title="Change Display Name" onClose={onClose} styles={styles} colors={colors} testID="settings-modal-name">
      <Text style={styles.modalFieldLabel}>New Name</Text>
      <View style={styles.modalInput}>
        <Feather name="user" size={15} color={colors.textDim} />
        <TextInput
          testID="settings-modal-name-input"
          style={styles.modalTextInput}
          value={newName}
          onChangeText={(v) => { setNewName(v); setNameError(''); }}
          placeholder="Your name"
          placeholderTextColor={colors.textDim}
          autoCapitalize="words"
          autoFocus
        />
      </View>
      {!!nameError && <Text style={{ fontSize: 12, color: colors.accentRed, marginTop: 6 }} testID="settings-modal-name-error">{nameError}</Text>}
      <ModalButtons onCancel={onClose} onSave={onSave} loading={loading} styles={styles} testIDPrefix="settings-modal-name" />
    </AppModal>
  );
}
